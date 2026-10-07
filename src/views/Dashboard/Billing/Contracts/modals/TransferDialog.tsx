import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ArrowLeftRight, Check, Loader2, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContractListItem, RenterListItem } from "@/features/billing/types";
import { useChangeContractRenterMutation, useLazyGetRentersQuery } from "@/services/billingApi";
import { getApiErrorMessage } from "@/utils/downloadFile";
import { useDebounce } from "@/utils/useDebounce";
import { DIALOG_CONTENT, DIALOG_DESC, DIALOG_TITLE, FIELD, LABEL, OUTLINE_BTN, PRIMARY_BTN } from "./dialogStyles";

interface TransferDialogProps {
  open: boolean;
  contract: ContractListItem | null;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

const MIN_SEARCH = 2;

/** Shartnomani boshqa ijarachiga o'tkazish: qidirish (debounce 400ms) → tanlash → tasdiqlash. */
function TransferDialog({ open, contract, onOpenChange, onDone }: TransferDialogProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search.trim(), 400);
  const [selected, setSelected] = useState<RenterListItem | null>(null);
  const [fetchRenters, { data, isFetching }] = useLazyGetRentersQuery();
  const [changeRenter, { isLoading }] = useChangeContractRenterMutation();

  useEffect(() => {
    if (open) {
      setSearch("");
      setSelected(null);
    }
  }, [open, contract?.id]);

  useEffect(() => {
    if (!open) return;
    if (debounced.length < MIN_SEARCH) return;
    fetchRenters({ search: debounced, page: 1, per_page: 20 }, true);
  }, [open, debounced, fetchRenters]);

  const currentRenterId = contract?.renter?.id;
  const results = debounced.length >= MIN_SEARCH ? (data?.results ?? []).filter((r) => r.id !== currentRenterId) : [];

  const submit = async () => {
    if (!contract || !selected) return;
    try {
      await changeRenter({ id: contract.id, body: { renter: selected.id } }).unwrap();
      toast.success(t("billing.contracts_transfer_success"));
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("billing.contracts_transfer_error")));
    }
  };

  const renterLine = (r: { pinfl?: string | null; stir?: string | null; phone?: string | null }) =>
    [
      r.pinfl ? `${t("billing.contracts_renter_pinfl")}: ${r.pinfl}` : "",
      r.stir ? `${t("billing.contracts_renter_stir")}: ${r.stir}` : "",
      r.phone ? `${t("billing.contracts_renter_phone")}: ${r.phone}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <Dialog open={open} onOpenChange={(o) => !isLoading && onOpenChange(o)}>
      <DialogContent className={`sm:max-w-[720px] max-h-[90vh] overflow-y-auto ${DIALOG_CONTENT}`}>
        <DialogHeader>
          <DialogTitle className={DIALOG_TITLE}>{t("billing.contracts_transfer_title")}</DialogTitle>
          <DialogDescription className={DIALOG_DESC}>
            {t("billing.contracts_transfer_desc", { number: contract?.contract_number || contract?.number || "" })}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
            {t("billing.contracts_transfer_current")}
          </p>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <UserRound size={16} className="text-slate-400" />
            {contract?.renter?.full_name || "-"}
          </p>
          {contract?.renter && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{renterLine(contract.renter)}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className={LABEL}>{t("billing.contracts_transfer_search")}</Label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              className={`${FIELD} pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("billing.contracts_transfer_search_ph")}
            />
            {isFetching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("billing.contracts_transfer_results")}
          </p>
          <div className="max-h-[300px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
            {debounced.length < MIN_SEARCH ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 p-4 text-center">{t("billing.contracts_transfer_type")}</p>
            ) : results.length === 0 && !isFetching ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 p-4 text-center">{t("billing.contracts_transfer_empty")}</p>
            ) : (
              results.map((r) => {
                const isSel = selected?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelected(isSel ? null : r)}
                    aria-pressed={isSel}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors cursor-pointer ${
                      isSel
                        ? "bg-blue-50 dark:bg-blue-500/15"
                        : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSel ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {isSel && <Check size={12} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{r.full_name}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{renterLine(r) || "—"}</span>
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                      {t("billing.contracts_contracts_count", { count: r.contracts_count })}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
          <Button type="button" variant="outline" className={OUTLINE_BTN} disabled={isLoading} onClick={() => onOpenChange(false)}>
            {t("billing.contracts_back")}
          </Button>
          <Button type="button" className={PRIMARY_BTN} disabled={!selected || isLoading} onClick={submit}>
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftRight size={16} />}
            {t("billing.contracts_transfer_confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TransferDialog;
