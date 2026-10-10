import { Suspense, lazy, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  ChartColumnStacked,
  ChevronRight,
  FileBarChart2,
  Inbox,
  MapPinned,
  RefreshCw,
  Timer,
} from "lucide-react";
import type { RootState } from "@/app/store";
import { cn } from "@/lib/utils";
import { useGetDashboardOverviewQuery } from "@/services/reportsApi";
import { regions2 } from "@/services/constants";
import type { DashboardOverview, OverviewPeriod } from "@/types/dashboardOverview";
import { KpiRow } from "./KpiRow";
import { EmptyHint, Panel, SkeletonBlock, StatusLegend, panelClass } from "./Panel";
import { TopFormsList } from "./TopFormsList";
import { UpcomingDeadlines } from "./UpcomingDeadlines";
import {
  DISCIPLINE_KEYS,
  disciplineColors,
  useChartTheme,
  useFormatters,
  type DisciplineKey,
  type Formatters,
} from "./theme";

// recharts og'ir — alohida chunk
const MonthlyTrendChart = lazy(() => import("./StatsCharts").then((m) => ({ default: m.MonthlyTrendChart })));
const DisciplineDonut = lazy(() => import("./StatsCharts").then((m) => ({ default: m.DisciplineDonut })));
const RegionChart = lazy(() => import("./StatsCharts").then((m) => ({ default: m.RegionChart })));

const PERIODS: OverviewPeriod[] = ["month", "quarter", "year", "all"];

/** Muddat intizomi bo'laklari → mavjud ro'yxat sahifalari. */
const DISCIPLINE_LINKS: Record<DisciplineKey, string> = {
  on_time: "/main/on-time",
  late: "/main/late",
  in_review: "/main/send-report",
  missing: "/main/expired-deadlines",
};

function PeriodSwitch({ value, onChange }: { value: OverviewPeriod; onChange: (p: OverviewPeriod) => void }) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t("report_stats.title")}
      className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 p-0.5"
    >
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={cn(
            "px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-[10px] transition-all cursor-pointer whitespace-nowrap",
            value === p
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
          )}
        >
          {t(`report_stats.periods.${p}`)}
        </button>
      ))}
    </div>
  );
}

function ChartFallback({ className = "h-[260px]" }: { className?: string }) {
  return <SkeletonBlock className={cn("w-full", className)} />;
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="@container">
        <div className="grid grid-cols-2 @lg:grid-cols-3 @4xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className={cn("h-[132px] rounded-2xl", i === 0 && "col-span-2 @lg:col-span-1")} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonBlock className="h-[340px] rounded-2xl lg:col-span-2" />
        <SkeletonBlock className="h-[340px] rounded-2xl" />
      </div>
    </div>
  );
}

function DisciplinePanel({ data, fmt }: { data: DashboardOverview["discipline"]; fmt: Formatters }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useChartTheme();
  const colors = disciplineColors(theme.status);

  return (
    <Panel
      title={t("report_stats.discipline_title")}
      subtitle={t("report_stats.discipline_subtitle")}
      icon={Timer}
      iconClass="bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
    >
      {data.total === 0 ? (
        <EmptyHint icon={Timer} text={t("report_stats.empty")} />
      ) : (
        <div className="flex flex-col gap-3">
          <Suspense fallback={<ChartFallback className="h-[200px] rounded-full mx-auto max-w-[200px]" />}>
            <DisciplineDonut data={data} />
          </Suspense>
          <ul className="space-y-0.5">
            {DISCIPLINE_KEYS.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => navigate(DISCIPLINE_LINKS[key])}
                  className="group w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 -mx-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors[key] }} />
                    {t(`report_stats.discipline.${key}`)}
                  </span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{fmt.num(data[key])}</span>
                    <span className="w-12 text-right text-slate-400 dark:text-slate-500">
                      {fmt.pct(data.total ? (data[key] * 100) / data.total : 0)}
                    </span>
                    <ChevronRight
                      size={13}
                      className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500"
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 text-center">
            {t("report_stats.completion_rate", {
              value: data.completion_rate.toLocaleString(fmt.locale, { maximumFractionDigits: 1 }),
            })}
          </p>
        </div>
      )}
    </Panel>
  );
}

/**
 * Bosh sahifa (login'dan keyin): hisobotlar statistikasi — KPI'lar, oylik dinamika,
 * muddat intizomi, faol shakllar, hududlar kesimi va yaqin muddatlar.
 * Ma'lumot: GET /reports/dashboard/overview/ (foydalanuvchi doirasida).
 */
export default function ReportStatsSection() {
  const { t } = useTranslation();
  const lang = useSelector((state: RootState) => state.language.lang);
  const [period, setPeriod] = useState<OverviewPeriod>("year");
  const fmt = useFormatters();
  const { data, isLoading, isFetching, isError, refetch } = useGetDashboardOverviewQuery({ lang, period });

  const regionLabel = (code: string, fallback: string) => {
    const region = regions2.find((r) => r.value === code);
    if (!region) return fallback;
    return lang === "ru" ? region.label2 : region.label;
  };

  const rangeLabel = data
    ? data.period_start
      ? t("report_stats.period_range", { from: fmt.dayYear(data.period_start), to: fmt.dayYear(data.period_end) })
      : t("report_stats.period_all_range", { to: fmt.dayYear(data.period_end) })
    : "";

  const isEmpty =
    !!data && data.kpis.total.value === 0 && data.discipline.total === 0 && data.upcoming_deadlines.length === 0;

  return (
    <section className="space-y-4" aria-labelledby="report-stats-title">
      {/* Sarlavha + davr tanlash */}
      <div className={cn(panelClass, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3")}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 shrink-0">
            <BarChart3 size={20} />
          </div>
          <div className="min-w-0">
            <h2
              id="report-stats-title"
              className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight"
            >
              {t("report_stats.title")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              {data ? `${t(`report_stats.scope.${data.scope.level}`)} · ${rangeLabel}` : t("report_stats.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <PeriodSwitch value={period} onChange={setPeriod} />
          <button
            type="button"
            onClick={() => refetch()}
            title={data ? t("report_stats.updated", { time: fmt.time(data.generated_at) }) : undefined}
            aria-label={t("report_stats.retry")}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw size={15} className={cn(isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <div className={cn(panelClass, "p-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-center")}>
          <AlertTriangle size={20} className="text-amber-500" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("report_stats.error")}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="h-8 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
          >
            {t("report_stats.retry")}
          </button>
        </div>
      ) : isEmpty ? (
        <div className={cn(panelClass, "p-6")}>
          <EmptyHint icon={Inbox} text={t("report_stats.empty")} />
        </div>
      ) : (
        <div className={cn("space-y-4 transition-opacity", isFetching && "opacity-70")}>
          <KpiRow data={data} fmt={fmt} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel
              className="lg:col-span-2"
              title={t("report_stats.monthly_title")}
              subtitle={t("report_stats.monthly_subtitle")}
              icon={ChartColumnStacked}
              actions={<StatusLegend className="hidden md:flex justify-end max-w-[320px]" />}
            >
              <StatusLegend className="md:hidden mb-3" />
              <Suspense fallback={<ChartFallback />}>
                <MonthlyTrendChart data={data.monthly} />
              </Suspense>
            </Panel>
            <DisciplinePanel data={data.discipline} fmt={fmt} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel
              title={t("report_stats.top_forms_title")}
              subtitle={t("report_stats.top_forms_subtitle")}
              icon={FileBarChart2}
            >
              {data.top_forms.length ? (
                <TopFormsList forms={data.top_forms} fmt={fmt} />
              ) : (
                <EmptyHint icon={FileBarChart2} text={t("report_stats.empty")} />
              )}
            </Panel>
            <Panel
              title={t("report_stats.upcoming_title")}
              subtitle={t("report_stats.upcoming_subtitle")}
              icon={CalendarClock}
              iconClass="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
            >
              {data.upcoming_deadlines.length ? (
                <UpcomingDeadlines items={data.upcoming_deadlines} fmt={fmt} />
              ) : (
                <EmptyHint icon={CalendarClock} text={t("report_stats.upcoming_empty")} />
              )}
            </Panel>
          </div>

          {data.regions.length > 0 && (
            <Panel
              title={t("report_stats.regions_title")}
              subtitle={t("report_stats.regions_subtitle")}
              icon={MapPinned}
              iconClass="bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300"
              actions={<StatusLegend className="hidden md:flex justify-end" />}
            >
              <StatusLegend className="md:hidden mb-3" />
              <Suspense fallback={<ChartFallback className="h-[300px]" />}>
                <RegionChart data={data.regions} regionLabel={regionLabel} />
              </Suspense>
            </Panel>
          )}
        </div>
      )}
    </section>
  );
}
