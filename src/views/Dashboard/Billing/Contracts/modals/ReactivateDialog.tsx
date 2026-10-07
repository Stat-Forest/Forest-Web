import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ContractListItem } from "@/features/billing/types";
import { formatDate } from "@/features/billing/format";
import { useChangeContractStatusMutation } from "@/services/billingApi";
import { getApiErrorMessage } from "@/utils/downloadFile";
import { DIALOG_CONTENT, DIALOG_DESC, DIALOG_TITLE, OUTLINE_BTN } from "./dialogStyles";

interface ReactivateDialogProps {
  open: boolean;
  contract: ContractListItem | null;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/** Bekor qilingan shartnomani qayta faollashtirish (`status: active`). */
function ReactivateDialog({ open, contract, onOpenChange, onDone }: ReactivateDialogProps) {
  const { t } = useTranslation();
  const [changeStatus, { isLoading }] = useChangeContractStatusMutation();

  const submit = async () => {
    if (!contract) return;
    try {
      await changeStatus({ id: contract.id, body: { status: "active" } }).unwrap();
      toast.success(t("billing.contracts_reactivate_success"));
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("billing.contracts_status_error")));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isLoading && onOpenChange(o)}>
      <DialogContent className={`sm:max-w-[480px] ${DIALOG_CONTENT}`}>
        <DialogHeader>
          <DialogTitle className={DIALOG_TITLE}>{t("billing.contracts_reactivate_title")}</DialogTitle>
          <DialogDescription className={DIALOG_DESC}>
            {t("billing.contracts_reactivate_desc", { number: contract?.contract_number || contract?.number || "" })}
          </DialogDescription>
        </DialogHeader>

        {contract?.cancel_reason && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1">
              {t("billing.contracts_field_cancel_reason")}
              {contract.canceled_date ? ` · ${formatDate(contract.canceled_date)}` : ""}
            </p>
            <p className="text-slate-700 dark:text-slate-200 break-words">{contract.cancel_reason}</p>
          </div>
        )}

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
          <Button type="button" variant="outline" className={OUTLINE_BTN} disabled={isLoading} onClick={() => onOpenChange(false)}>
            {t("billing.contracts_back")}
          </Button>
          <Button
            type="button"
            className="rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isLoading}
            onClick={submit}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {t("billing.contracts_reactivate_confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReactivateDialog;
