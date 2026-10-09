import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, BarChart3, Coins, RefreshCw, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BILLING_YEAR_FROM, BILLING_YEAR_TO, YEARS } from "@/features/billing/constants";
import { formatArea, formatMoney } from "@/features/billing/format";
import type { RentStats, RentStatsYear } from "@/features/billing/types";
import {
  useGetContractsRentStatsQuery,
  useGetPublicRentStatsQuery,
  useGetPublicXojaliklarQuery,
  useGetXojaliklarQuery,
} from "@/services/billingApi";

/**
 * Ijara tushumi statistikasi (billing `YearlyAreaRevenueStats` analogi):
 * Yildan / Yilgacha / Xo'jalik filtrlari, 3 ta bar chart va 3 ta xulosa kartasi.
 * Hisob-kitob backend'da (`average_annual`, `growth`, `max`).
 *
 * - `public`    — landing (autentifikatsiyasiz `public/rent-stats/`, `public/xojaliklar/`)
 * - `contracts` — shartnomalar sahifasi (`contracts/rent-stats/`, foydalanuvchi ko'lamida)
 *
 * recharts og'ir — chaqiruvchi `lazy()` + `Suspense` bilan yuklashi kerak.
 */
export interface RentRevenueStatsProps {
  mode: "public" | "contracts";
  /** Berilsa sarlavha (`{title} ({from}-{to})`) filtrlar yonida ko'rsatiladi. */
  title?: string;
  className?: string;
}

const ALL = "all";

const CHART_COLORS = {
  price: "#1b5e20",
  area: "#43a047",
  total: "#7cb342",
} as const;

type MetricKey = "price_per_hectare" | "total_area" | "total_calculated";

interface ChartSpec {
  key: MetricKey;
  label: string;
  color: string;
  format: (value: number) => string;
}

const hasData = (stats: RentStats | undefined): stats is RentStats =>
  !!stats?.years?.length &&
  stats.years.some((y) => Number(y.total_calculated) > 0 || Number(y.total_area) > 0);

function RentRevenueStats({ mode, title, className = "" }: RentRevenueStatsProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "uz-UZ";
  const isPublic = mode === "public";

  const [fromYear, setFromYear] = useState<number>(BILLING_YEAR_FROM);
  const [toYear, setToYear] = useState<number>(BILLING_YEAR_TO);
  const [xojalik, setXojalik] = useState<string>(ALL);

  const params = useMemo(
    () => ({ from_year: fromYear, to_year: toYear, xojalik: xojalik === ALL ? "" : xojalik }),
    [fromYear, toYear, xojalik],
  );

  const publicStats = useGetPublicRentStatsQuery(params, { skip: !isPublic });
  const contractsStats = useGetContractsRentStatsQuery(params, { skip: isPublic });
  const { data: stats, isLoading, isFetching, isError, refetch } = isPublic ? publicStats : contractsStats;

  const { data: publicXojaliklar } = useGetPublicXojaliklarQuery(undefined, { skip: !isPublic });
  const { data: scopedXojaliklar } = useGetXojaliklarQuery(undefined, { skip: isPublic });
  const xojalikOptions = useMemo(
    () =>
      (isPublic ? publicXojaliklar : scopedXojaliklar)?.map((x) => ({ id: String(x.id), name: x.name })) ?? [],
    [isPublic, publicXojaliklar, scopedXojaliklar],
  );

  const currency = t("rent_stats.currency");
  const areaUnit = t("rent_stats.area_unit");
  const perHaUnit = t("rent_stats.per_hectare_unit");

  const compact = useMemo(
    () => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }),
    [locale],
  );
  const compactTick = (value: number) => compact.format(Number(value) || 0);

  const charts: ChartSpec[] = [
    {
      key: "price_per_hectare",
      label: t("rent_stats.price_per_hectare"),
      color: CHART_COLORS.price,
      format: (v) => formatMoney(v, perHaUnit),
    },
    {
      key: "total_area",
      label: t("rent_stats.total_area"),
      color: CHART_COLORS.area,
      format: (v) => formatArea(v, areaUnit),
    },
    {
      key: "total_calculated",
      label: t("rent_stats.total_calculated"),
      color: CHART_COLORS.total,
      format: (v) => formatMoney(v, currency),
    },
  ];

  // from ≤ to: chegarani kesib o'tsa ikkinchisini ham suramiz
  const changeFrom = (value: string) => {
    const y = Number(value);
    setFromYear(y);
    if (y > toYear) setToYear(y);
  };
  const changeTo = (value: string) => {
    const y = Number(value);
    setToYear(y);
    if (y < fromYear) setFromYear(y);
  };

  const shownFrom = stats?.from_year ?? fromYear;
  const shownTo = stats?.to_year ?? toYear;

  const triggerClass =
    "h-9 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100";

  const filters = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <FilterField label={t("rent_stats.from_year")}>
        <Select value={String(fromYear)} onValueChange={changeFrom}>
          <SelectTrigger className={`${triggerClass} w-[96px]`} aria-label={t("rent_stats.from_year")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label={t("rent_stats.to_year")}>
        <Select value={String(toYear)} onValueChange={changeTo}>
          <SelectTrigger className={`${triggerClass} w-[96px]`} aria-label={t("rent_stats.to_year")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label={t("rent_stats.xojalik")}>
        <Select value={xojalik} onValueChange={setXojalik}>
          <SelectTrigger className={`${triggerClass} w-[220px] max-w-[70vw]`} aria-label={t("rent_stats.xojalik")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[320px]">
            <SelectItem value={ALL}>{t("rent_stats.all")}</SelectItem>
            {xojalikOptions.map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {x.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
    </div>
  );

  let body: ReactNode;
  if (isLoading) {
    body = <StatsSkeleton />;
  } else if (isError) {
    body = (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-10 text-center">
        <AlertTriangle size={22} className="text-red-500 dark:text-red-400" />
        <p className="text-sm font-medium text-red-700 dark:text-red-300">{t("rent_stats.error")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-500/40 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} />
          {t("rent_stats.retry")}
        </button>
      </div>
    );
  } else if (!hasData(stats)) {
    body = (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 px-4 py-12 text-center">
        <BarChart3 size={24} className="text-slate-400 dark:text-slate-500" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("rent_stats.empty")}</p>
      </div>
    );
  } else {
    const diff = Number(stats.growth?.diff) || 0;
    const percent = Number(stats.growth?.percent) || 0;
    const negative = diff < 0;
    const sign = diff > 0 ? "+" : negative ? "−" : "";
    const growthText = `${sign}${formatMoney(Math.abs(diff), currency)} (${sign}${Math.abs(percent).toFixed(1)}%)`;
    const max = stats.max;

    body = (
      <div className={`space-y-4 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {charts.map((chart) => (
            <div
              key={chart.key}
              className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 sm:p-4"
            >
              <p className="mb-2 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                {chart.label}
              </p>
              <div className="h-[220px] w-full text-slate-500 dark:text-slate-400">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.years} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: "currentColor", fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "currentColor", strokeOpacity: 0.3 }}
                    />
                    <YAxis
                      width={52}
                      tick={{ fill: "currentColor", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={compactTick}
                    />
                    <Tooltip
                      cursor={{ fill: "currentColor", fillOpacity: 0.08 }}
                      wrapperStyle={{ outline: "none", zIndex: 20 }}
                      content={<ChartTooltip spec={chart} t={t} />}
                    />
                    <Bar
                      dataKey={chart.key}
                      name={chart.label}
                      fill={chart.color}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SummaryCard
            icon={<Coins size={20} />}
            tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            label={t("rent_stats.average_annual")}
            value={formatMoney(stats.average_annual, currency)}
          />
          <SummaryCard
            icon={negative ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
            tone={
              negative
                ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            }
            label={t("rent_stats.growth", { from: shownFrom, to: shownTo })}
            value={growthText}
            valueClass={negative ? "text-red-600 dark:text-red-400" : undefined}
          />
          <SummaryCard
            icon={<Trophy size={20} />}
            tone="bg-lime-50 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300"
            label={t("rent_stats.max")}
            value={
              max
                ? t("rent_stats.max_value", {
                    value: formatMoney(max.total_calculated, currency),
                    year: max.year,
                  })
                : "—"
            }
          />
        </div>
      </div>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs backdrop-blur-md transition-colors space-y-4 ${className}`}
    >
      <div className={`flex flex-wrap items-center gap-3 ${title ? "justify-between" : "justify-end"}`}>
        {title && (
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
            {title} ({shownFrom}-{shownTo})
          </h3>
        )}
        {filters}
      </div>
      {body}
    </section>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {label}
      </span>
      {children}
    </label>
  );
}

interface SummaryCardProps {
  icon: ReactNode;
  tone: string;
  label: string;
  value: string;
  valueClass?: string;
}

function SummaryCard({ icon, tone, label, value, valueClass }: SummaryCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p
          className={`text-base sm:text-lg font-bold tabular-nums break-words text-emerald-700 dark:text-emerald-400 ${valueClass ?? ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

interface ChartTooltipProps {
  spec: ChartSpec;
  t: (key: string, options?: Record<string, unknown>) => string;
  active?: boolean;
  payload?: Array<{ value?: number | string; payload?: RentStatsYear }>;
}

function ChartTooltip({ spec, t, active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const year = item.payload?.year;
  return (
    <div className="pointer-events-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      {year !== undefined && (
        <p className="mb-1 font-semibold text-slate-500 dark:text-slate-400">
          {t("rent_stats.year_label", { year })}
        </p>
      )}
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: spec.color }} />
        <span className="text-slate-600 dark:text-slate-300">{spec.label}:</span>
        <span className="font-bold text-slate-900 dark:text-white tabular-nums">
          {spec.format(Number(item.value) || 0)}
        </span>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4"
          >
            <div className="mx-auto mb-4 h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="flex h-[200px] items-end justify-between gap-2 px-2">
              {[45, 70, 55, 85, 60, 95, 75].map((h, j) => (
                <div
                  key={j}
                  className="w-full animate-pulse rounded-t-md bg-slate-200 dark:bg-slate-700"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4"
          >
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-5 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RentRevenueStats;
