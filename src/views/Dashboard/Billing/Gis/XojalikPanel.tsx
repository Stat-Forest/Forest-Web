import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ViloyatOption, XojalikKontur, XojalikLocation } from "@/features/billing/types";

/** Kontur ro'yxati juda uzun bo'lishi mumkin (minglab) — select'da shuncha ko'rsatamiz. */
const KONTUR_LIMIT = 300;

export interface XojalikPanelProps {
  viloyatlar: ViloyatOption[];
  xojaliklar: XojalikLocation[];
  konturlar: XojalikKontur[];
  konturLoading?: boolean;
  selectedViloyatId: string;
  selectedXojalikId: string;
  selectedKonturId: string;
  konturSearch: string;
  onViloyatChange: (id: string) => void;
  onXojalikChange: (id: string) => void;
  onKonturChange: (id: string) => void;
  onKonturSearchChange: (value: string) => void;
}

/**
 * "Xo'jalikka o'tish" — xaritaning yuqori-chap burchagidagi suzuvchi panel:
 * viloyat → xo'jalik → kontur qidiruv → kontur.
 */
function XojalikPanel({
  viloyatlar,
  xojaliklar,
  konturlar,
  konturLoading = false,
  selectedViloyatId,
  selectedXojalikId,
  selectedKonturId,
  konturSearch,
  onViloyatChange,
  onXojalikChange,
  onKonturChange,
  onKonturSearchChange,
}: XojalikPanelProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );

  const filteredKonturlar = useMemo(() => {
    const q = konturSearch.trim();
    const list = q ? konturlar.filter((k) => String(k.kontur_raqami).includes(q)) : konturlar;
    return { visible: list.slice(0, KONTUR_LIMIT), hidden: Math.max(0, list.length - KONTUR_LIMIT) };
  }, [konturlar, konturSearch]);

  const selectClass =
    "h-9 w-full rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-100 shadow-xs";

  return (
    <div
      className={`absolute top-3 left-3 z-[1000] rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-lg backdrop-blur-md transition-all ${
        collapsed ? "w-auto" : "w-[270px] max-w-[calc(100%-24px)]"
      }`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
        aria-expanded={!collapsed}
      >
        <span>{t("billing.goto_xojalik")}</span>
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2 px-3 pb-3">
          <Select
            value={selectedViloyatId}
            onValueChange={onViloyatChange}
          >
            <SelectTrigger className={selectClass} aria-label={t("billing.select_region")}>
              <SelectValue placeholder={t("billing.select_region")} />
            </SelectTrigger>
            <SelectContent className="z-[1100] max-h-72">
              {viloyatlar.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedXojalikId}
            onValueChange={onXojalikChange}
            disabled={!selectedViloyatId}
          >
            <SelectTrigger className={selectClass} aria-label={t("billing.select_xojalik")}>
              <SelectValue placeholder={t("billing.select_xojalik")} />
            </SelectTrigger>
            <SelectContent className="z-[1100] max-h-72">
              {xojaliklar.map((x) => (
                <SelectItem key={x.id} value={x.id}>
                  {x.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="text"
            value={konturSearch}
            onChange={(e) => onKonturSearchChange(e.target.value)}
            placeholder={t("billing.kontur_search_ph")}
            disabled={!selectedXojalikId}
            className="h-9 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs sm:text-sm shadow-xs"
          />

          <Select
            value={selectedKonturId}
            onValueChange={onKonturChange}
            disabled={!selectedXojalikId || konturLoading}
          >
            <SelectTrigger className={selectClass} aria-label={t("billing.select_kontur")}>
              {konturLoading ? (
                <span className="flex items-center gap-2 text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  {t("billing.loading")}
                </span>
              ) : (
                <SelectValue placeholder={t("billing.select_kontur")} />
              )}
            </SelectTrigger>
            <SelectContent className="z-[1100] max-h-72">
              {filteredKonturlar.visible.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("billing.no_konturs")}
                </div>
              ) : (
                filteredKonturlar.visible.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    №{k.kontur_raqami}
                    {k.area_ga ? ` — ${k.area_ga} ga` : ""}
                  </SelectItem>
                ))
              )}
              {filteredKonturlar.hidden > 0 && (
                <div className="px-2 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
                  {t("billing.kontur_more", { count: filteredKonturlar.hidden })}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export default XojalikPanel;
