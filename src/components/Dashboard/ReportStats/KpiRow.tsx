import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleCheckBig,
  FileStack,
  Minus,
  PencilLine,
  Send,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardOverview, OverviewKpi } from "@/types/dashboardOverview";
import { panelClass } from "./Panel";
import type { Formatters } from "./theme";

type KpiKey = keyof DashboardOverview["kpis"];

interface KpiSpec {
  key: KpiKey;
  icon: LucideIcon;
  /** Bosilganda ochiladigan mavjud ro'yxat sahifasi (jami uchun yo'q). */
  to?: string;
  /** O'sish yaxshimi (yashil), yomonmi (qizil) yoki neytral. */
  trend: "up_good" | "up_bad" | "neutral";
  chip: string;
  bar: string;
}

const KPIS: KpiSpec[] = [
  {
    key: "total",
    icon: FileStack,
    trend: "up_good",
    chip: "bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
    bar: "bg-indigo-500",
  },
  {
    key: "accepted",
    icon: CircleCheckBig,
    to: "/main/received-report",
    trend: "up_good",
    chip: "bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
    bar: "bg-emerald-500 dark:bg-emerald-600",
  },
  {
    key: "sent",
    icon: Send,
    to: "/main/send-report",
    trend: "neutral",
    chip: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
    bar: "bg-amber-500 dark:bg-amber-600",
  },
  {
    key: "saved",
    icon: PencilLine,
    to: "/main/draft",
    trend: "neutral",
    chip: "bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
    bar: "bg-blue-500",
  },
  {
    key: "cancelled",
    icon: Undo2,
    to: "/main/returned-report",
    trend: "up_bad",
    chip: "bg-red-600/10 text-red-600 dark:bg-red-500/20 dark:text-red-300",
    bar: "bg-red-500",
  },
];

function ChangePill({ kpi, trend, fmt }: { kpi: OverviewKpi; trend: KpiSpec["trend"]; fmt: Formatters }) {
  const { t } = useTranslation();
  const change = kpi.change_pct;
  if (change === null) {
    return kpi.previous === null ? null : (
      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
        {t("report_stats.no_previous")}
      </span>
    );
  }
  const up = change > 0;
  const flat = change === 0;
  const good = trend === "up_good" ? up : trend === "up_bad" ? !up : null;
  const tone =
    flat || good === null
      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      : good
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        : "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      title={`${t("report_stats.vs_previous")}: ${fmt.num(kpi.previous ?? 0)}`}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
        tone,
      )}
    >
      <Icon size={11} strokeWidth={2.5} />
      {fmt.pct(Math.abs(change))}
    </span>
  );
}

export function KpiRow({ data, fmt }: { data: DashboardOverview; fmt: Formatters }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    // container query: sidebar ochiq/yopiqligiga qarab ustunlar soni
    <div className="@container">
      <div className="grid grid-cols-2 @lg:grid-cols-3 @4xl:grid-cols-5 gap-3">
        {KPIS.map((spec) => {
          const kpi = data.kpis[spec.key];
          const Icon = spec.icon;
          const isTotal = spec.key === "total";
          const barPct = isTotal ? data.acceptance_rate : kpi.share_pct;
          const to = spec.to;
          return (
            <button
              key={spec.key}
              type="button"
              disabled={!to}
              onClick={to ? () => navigate(to) : undefined}
              className={cn(
                panelClass,
                "text-left p-4 flex flex-col gap-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:cursor-default",
                to &&
                  "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700",
                isTotal && "col-span-2 @lg:col-span-1",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className={cn("p-2 rounded-xl", spec.chip)}>
                  <Icon size={18} />
                </div>
                <ChangePill kpi={kpi} trend={spec.trend} fmt={fmt} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 leading-tight">
                  {t(`report_stats.kpi.${spec.key}`)}
                </p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white leading-none">
                  {fmt.num(kpi.value)}
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-700", spec.bar)}
                    style={{ width: `${Math.min(barPct, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {isTotal
                    ? `${t("report_stats.acceptance_rate")}: ${fmt.pct(data.acceptance_rate)}`
                    : t("report_stats.share", {
                        value: kpi.share_pct.toLocaleString(fmt.locale, { maximumFractionDigits: 1 }),
                      })}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
