import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OverviewTopForm } from "@/types/dashboardOverview";
import type { Formatters } from "./theme";

function rateTone(rate: number) {
  if (rate >= 80) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (rate >= 50) return "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  return "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
}

/**
 * Eng faol hisobot shakllari: gorizontal bar (uzunligi — hisobotlar soni,
 * ichidagi to'q qism — qabul qilinganlar), o'ngda qabul darajasi.
 */
export function TopFormsList({ forms, fmt }: { forms: OverviewTopForm[]; fmt: Formatters }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const max = Math.max(1, ...forms.map((f) => f.total));

  return (
    <ul className="space-y-1">
      {forms.map((form) => (
        <li key={form.id}>
          <button
            type="button"
            onClick={() => navigate(`/resource-management/${form.id}/${encodeURIComponent(form.name)}`)}
            className="group w-full text-left rounded-xl px-2 py-2 -mx-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
          >
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{form.name}</p>
                {form.parent_name && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{form.parent_name}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">
                  {fmt.num(form.total)}
                </span>
                <span
                  title={t("report_stats.acceptance_rate")}
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    rateTone(form.acceptance_rate),
                  )}
                >
                  {fmt.pct(form.acceptance_rate)}
                </span>
                <ChevronRight
                  size={14}
                  className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors"
                />
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-200 dark:bg-indigo-900/70 transition-[width] duration-700"
                style={{ width: `${(form.total / max) * 100}%` }}
              >
                <div
                  className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                  style={{ width: `${form.total ? (form.accepted / form.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
