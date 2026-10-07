import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import type { Xojalik } from "@/features/billing/types";
import { EMPTY_GIS_FILTERS, type GisFilterState } from "@/features/billing/gisFilters";

// Radix Select bo'sh string qiymatli item'ga ruxsat bermaydi — "Barchasi" uchun sentinel.
const ALL = "__all__";

interface GisFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: GisFilterState;
  xojaliklar: Xojalik[];
  onApply: (filters: GisFilterState) => void;
  onClear: () => void;
}

function GisFilterDialog({ open, onOpenChange, filters, xojaliklar, onApply, onClear }: GisFilterDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<GisFilterState>(filters);

  // Dialog ochilganda joriy qo'llangan filtrlardan boshlaymiz
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const set = <K extends keyof GisFilterState>(key: K, value: GisFilterState[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const fieldClass =
    "h-10 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm";
  const labelClass = "text-sm font-medium text-slate-700 dark:text-slate-200";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {t("billing.filter_title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            {t("billing.filter_desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label className={labelClass}>{t("billing.filter_stir")}</Label>
            <Input
              className={fieldClass}
              value={draft.stir}
              onChange={(e) => set("stir", e.target.value)}
              placeholder={t("billing.filter_stir_ph")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>{t("billing.filter_fullname")}</Label>
            <Input
              className={fieldClass}
              value={draft.fullname}
              onChange={(e) => set("fullname", e.target.value)}
              placeholder={t("billing.filter_fullname_ph")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>{t("billing.filter_number")}</Label>
            <Input
              className={fieldClass}
              value={draft.number}
              onChange={(e) => set("number", e.target.value)}
              placeholder={t("billing.filter_number_ph")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>{t("billing.filter_xojalik")}</Label>
            <Select
              value={draft.xojalik || ALL}
              onValueChange={(v) => set("xojalik", v === ALL ? "" : v)}
            >
              <SelectTrigger className={`${fieldClass} w-full`}>
                <SelectValue placeholder={t("billing.all")} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ALL}>{t("billing.all")}</SelectItem>
                {xojaliklar.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>{t("billing.filter_from")}</Label>
            <Input
              type="date"
              className={fieldClass}
              value={draft.from_date}
              onChange={(e) => set("from_date", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>{t("billing.filter_to")}</Label>
            <Input
              type="date"
              className={fieldClass}
              value={draft.to_date}
              onChange={(e) => set("to_date", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>{t("billing.filter_status")}</Label>
            <Select
              value={draft.status || ALL}
              onValueChange={(v) => set("status", v === ALL ? "" : (v as GisFilterState["status"]))}
            >
              <SelectTrigger className={`${fieldClass} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("billing.status_default")}</SelectItem>
                <SelectItem value="all">{t("billing.status_all")}</SelectItem>
                <SelectItem value="active">{t("billing.status_active")}</SelectItem>
                <SelectItem value="inactive">{t("billing.status_inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>{t("billing.filter_debtors")}</Label>
            <Select
              value={draft.debtors ? "debtors" : ALL}
              onValueChange={(v) => set("debtors", v === "debtors")}
            >
              <SelectTrigger className={`${fieldClass} w-full`}>
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
          <Button
            type="button"
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            onClick={() => onApply(draft)}
          >
            {t("billing.apply_filter")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            {t("billing.close")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setDraft(EMPTY_GIS_FILTERS);
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

export default GisFilterDialog;
