import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OverviewUpcomingDeadline } from "@/types/dashboardOverview";
import type { Formatters } from "./theme";

function daysTone(days: number) {
  if (days <= 2)
    return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30";
  if (days <= 7)
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30";
  return "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30";
}

export function UpcomingDeadlines({ items, fmt }: { items: OverviewUpcomingDeadline[]; fmt: Formatters }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const daysLabel = (days: number) =>
    days <= 0
      ? t("report_stats.today")
      : days === 1
        ? t("report_stats.tomorrow")
        : t("report_stats.days_left", { count: days });

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((item) => {
        const progress = item.organizations ? (item.submitted / item.organizations) * 100 : 0;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() =>
                navigate(`/resource-management/${item.statement_id}/${encodeURIComponent(item.statement_name)}`)
              }
              className="w-full text-left flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            >
              <div className="shrink-0 w-11 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 py-1">
                <CalendarClock size={13} className="mx-auto text-slate-400 dark:text-slate-500" />
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-tight mt-0.5">
                  {fmt.day(item.deadline_at)}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {item.statement_name}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{item.parent_name}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 dark:bg-emerald-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                    {t("report_stats.submitted_of", { submitted: item.submitted, total: item.organizations })}
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset whitespace-nowrap",
                  daysTone(item.days_left),
                )}
              >
                {daysLabel(item.days_left)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
