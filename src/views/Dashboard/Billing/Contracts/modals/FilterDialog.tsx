import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { skipToken } from "@reduxjs/toolkit/query";
import { Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetBillingRegionsQuery,
  useGetBolimlarQuery,
  useGetXojaliklarQuery,
} from "@/services/billingApi";
import { EMPTY_CONTRACTS_FILTERS, type ContractsFilterState } from "../components/contractsFilters";
import { DIALOG_CONTENT, DIALOG_DESC, DIALOG_TITLE, FIELD, LABEL, OUTLINE_BTN, PRIMARY_BTN } from "./dialogStyles";

// Radix Select bo'sh string qiymatli item'ga ruxsat bermaydi — "Barchasi" uchun sentinel.
const ALL = "__all__";

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ContractsFilterState;
  onApply: (filters: ContractsFilterState) => void;
  onClear: () => void;
}

/** Shartnomalar filtri: INN/JSHSHIR, F.I.O, raqam, viloyat → xo'jalik → bo'lim, sanalar, qarzdorlar. */
function FilterDialog({ open, onOpenChange, filters, onApply, onClear }: FilterDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ContractsFilterState>(filters);
  const [xojalikSearch, setXojalikSearch] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(filters);
      setXojalikSearch("");
    }
  }, [open, filters]);

  const { data: regions = [] } = useGetBillingRegionsQuery(undefined, { skip: !open });
  const { data: xojaliklar = [] } = useGetXojaliklarQuery(open ? { region: draft.region } : skipToken);
  const { data: bolimlar = [] } = useGetBolimlarQuery(open && draft.xojalik ? { xojalik: draft.xojalik } : skipToken);

  const filteredXojaliklar = useMemo(() => {
    const q = xojalikSearch.trim().toLowerCase();
    const list = q ? xojaliklar.filter((x) => x.name.toLowerCase().includes(q) || (x.inn ?? "").includes(q)) : xojaliklar;
    // Tanlangan xo'jalik qidiruvda chiqmasa ham ro'yxatda qolsin (Select qiymati ko'rinsin)
    if (draft.xojalik && !list.some((x) => x.id === draft.xojalik)) {
      const sel = xojaliklar.find((x) => x.id === draft.xojalik);
      if (sel) return [sel, ...list];
    }
    return list;
  }, [xojaliklar, xojalikSearch, draft.xojalik]);

  const set = <K extends keyof ContractsFilterState>(key: K, value: ContractsFilterState[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const selectTrigger = `${FIELD} w-full`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[760px] max-h-[90vh] overflow-y-auto ${DIALOG_CONTENT}`}>
        <DialogHeader>
          <DialogTitle className={DIALOG_TITLE}>{t("billing.filter_title")}</DialogTitle>
          <DialogDescription className={DIALOG_DESC}>{t("billing.contracts_filter_desc")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label className={LABEL}>{t("billing.filter_stir")}</Label>
            <Input className={FIELD} value={draft.stir} onChange={(e) => set("stir", e.target.value)} placeholder={t("billing.filter_stir_ph")} />
          </div>
          <div className="space-y-1.5">
            <Label className={LABEL}>{t("billing.filter_fullname")}</Label>
            <Input className={FIELD} value={draft.fullname} onChange={(e) => set("fullname", e.target.value)} placeholder={t("billing.filter_fullname_ph")} />
          </div>
          <div className="space-y-1.5">
            <Label className={LABEL}>{t("billing.filter_number")}</Label>
            <Input className={FIELD} value={draft.number} onChange={(e) => set("number", e.target.value)} placeholder={t("billing.filter_number_ph")} />
          </div>

          <div className="space-y-1.5">
            <Label className={LABEL}>{t("billing.contracts_filter_region")}</Label>
            <Select
              value={draft.region || ALL}
              onValueChange={(v) => {
                const region = v === ALL ? "" : v;
                setDraft((prev) => ({ ...prev, region, xojalik: "", bolim: "" }));
              }}
            >
              <SelectTrigger className={selectTrigger}>
                <SelectValue placeholder={t("billing.all")} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ALL}>{t("billing.all")}</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className={LABEL}>{t("billing.filter_xojalik")}</Label>
            <Select
              value={draft.xojalik || ALL}
              onValueChange={(v) => {
                const xojalik = v === ALL ? "" : v;
                setDraft((prev) => ({ ...prev, xojalik, bolim: "" }));
              }}
            >
              <SelectTrigger className={selectTrigger}>
                <SelectValue placeholder={t("billing.all")} />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <div className="p-2 sticky top-0 bg-popover z-10" onKeyDown={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="h-8 pl-8 text-sm rounded-md"
                      value={xojalikSearch}
                      onChange={(e) => setXojalikSearch(e.target.value)}
                      placeholder={t("billing.contracts_filter_xojalik_search")}
                    />
                  </div>
                </div>
                <SelectItem value={ALL}>{t("billing.all")}</SelectItem>
                {filteredXojaliklar.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className={LABEL}>{t("billing.contracts_filter_bolim")}</Label>
            <Select
              value={draft.bolim || ALL}
              disabled={!draft.xojalik}
              onValueChange={(v) => set("bolim", v === ALL ? "" : v)}
            >
              <SelectTrigger className={selectTrigger}>
                <SelectValue placeholder={t("billing.all")} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ALL}>{t("billing.all")}</SelectItem>
                {bolimlar.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className={LABEL}>{t("billing.filter_from")}</Label>
            <Input type="date" className={FIELD} value={draft.from_date} onChange={(e) => set("from_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className={LABEL}>{t("billing.filter_to")}</Label>
            <Input type="date" className={FIELD} value={draft.to_date} onChange={(e) => set("to_date", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className={LABEL}>{t("billing.filter_debtors")}</Label>
            <Select value={draft.debtors ? "debtors" : ALL} onValueChange={(v) => set("debtors", v === "debtors")}>
              <SelectTrigger className={selectTrigger}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("billing.all")}</SelectItem>
                <SelectItem value="debtors">{t("billing.debtors")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-start">
          <Button type="button" className={PRIMARY_BTN} onClick={() => onApply(draft)}>
            {t("billing.apply_filter")}
          </Button>
          <Button type="button" variant="outline" className={OUTLINE_BTN} onClick={() => onOpenChange(false)}>
            {t("billing.close")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={OUTLINE_BTN}
            onClick={() => {
              setDraft(EMPTY_CONTRACTS_FILTERS);
              onClear();
            }}
          >
            {t("billing.clear")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FilterDialog;
