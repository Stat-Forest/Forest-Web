import { useId, useMemo, useState, type ReactNode } from "react";
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
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Coins,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
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
 * Ko'rinishlar (`variant`): `default` — oddiy karta; `featured` — landing'ning to'q
 * gradientli bloki; `compact` — ixcham (shartnomalar sahifasi): xulosa chiplari
 * diagrammalar ustida, past diagrammalar, yig'ib qo'yish tugmasi (holat localStorage'da).
 *
 * recharts og'ir — chaqiruvchi `lazy()` + `Suspense` bilan yuklashi kerak.
 */
export interface RentRevenueStatsProps {
  mode: "public" | "contracts";
  /** Berilsa sarlavha (`{title} ({from}-{to})`) filtrlar yonida ko'rsatiladi. */
  title?: string;
  /**
   * `featured` — landing uchun to'q gradientli ko'rinish (sarlavha, katta KPI'lar, gradient bar'lar).
   * `compact` — ixcham: kichik sarlavha, xulosa chiplari diagrammalar ustida, 140px diagrammalar,
   * yig'ish/yoyish tugmasi (holati localStorage'da saqlanadi, boshida yoyilgan).
   */
  variant?: "default" | "featured" | "compact";
  /** `featured` sarlavhasi ostidagi izoh. */
  subtitle?: string;
  className?: string;
}

const ALL = "all";

const COLLAPSED_STORAGE_KEY = "rent-stats-compact-collapsed";

const readCollapsed = (): boolean => {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const writeCollapsed = (value: boolean) => {
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // localStorage yopiq (private rejim va h.k.) — holat faqat shu sessiyada
  }
};

const CHART_COLORS = {
  price: "#1b5e20",
  area: "#43a047",
  total: "#7cb342",
} as const;

type MetricKey = "price_per_hectare" | "total_area" | "total_calculated";

/** `featured` ko'rinishdagi gradient bar ranglari (to'q fonda yaxshi ko'rinadi). */
const FEATURED_COLORS: Record<MetricKey, { from: string; to: string }> = {
  price_per_hectare: { from: "#34d399", to: "#065f46" },
  total_area: { from: "#4ade80", to: "#166534" },
  total_calculated: { from: "#bef264", to: "#3f6212" },
};

interface ChartSpec {
  key: MetricKey;
  label: string;
  color: string;
  format: (value: number) => string;
}

const hasData = (stats: RentStats | undefined): stats is RentStats =>
  !!stats?.years?.length &&
  stats.years.some((y) => Number(y.total_calculated) > 0 || Number(y.total_area) > 0);

function RentRevenueStats({ mode, title, subtitle, variant = "default", className = "" }: RentRevenueStatsProps) {
  const featured = variant === "featured";
  const isCompact = variant === "compact";
  const bodyId = useId();
  const [collapsed, setCollapsed] = useState<boolean>(() => isCompact && readCollapsed());
  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      writeCollapsed(!prev);
      return !prev;
    });
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

  const triggerClass = featured
    ? "h-9 rounded-lg bg-white/10 border-white/15 text-white backdrop-blur-md hover:bg-white/15 [&_svg]:text-emerald-200"
    : isCompact
      ? "h-8 data-[size=default]:h-8 rounded-lg px-2.5 py-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
      : "h-9 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100";
  const yearWidth = isCompact ? "w-[84px]" : "w-[96px]";

  const filters = (
    <div className={`flex flex-wrap items-center ${isCompact ? "gap-x-3 gap-y-2" : "gap-x-4 gap-y-2"}`}>
      <FilterField label={t("rent_stats.from_year")} featured={featured} compact={isCompact}>
        <Select value={String(fromYear)} onValueChange={changeFrom}>
          <SelectTrigger className={`${triggerClass} ${yearWidth}`} aria-label={t("rent_stats.from_year")}>
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
      <FilterField label={t("rent_stats.to_year")} featured={featured} compact={isCompact}>
        <Select value={String(toYear)} onValueChange={changeTo}>
          <SelectTrigger className={`${triggerClass} ${yearWidth}`} aria-label={t("rent_stats.to_year")}>
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
      <FilterField label={t("rent_stats.xojalik")} featured={featured} compact={isCompact}>
        <Select value={xojalik} onValueChange={setXojalik}>
          <SelectTrigger
            className={`${triggerClass} ${isCompact ? "w-[200px]" : "w-[220px]"} max-w-[70vw]`}
            aria-label={t("rent_stats.xojalik")}
          >
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
    body = isCompact ? <CompactSkeleton collapsed={collapsed} /> : <StatsSkeleton featured={featured} />;
  } else if (isError) {
    body = (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 text-center ${
          isCompact ? "py-5" : "py-10"
        }`}
      >
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
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-center ${
          isCompact ? "py-6" : "py-12"
        } ${
          featured
            ? "border-white/15 bg-white/5"
            : "border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40"
        }`}
      >
        <BarChart3 size={24} className={featured ? "text-emerald-200/70" : "text-slate-400 dark:text-slate-500"} />
        <p className={`text-sm font-medium ${featured ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>
          {t("rent_stats.empty")}
        </p>
      </div>
    );
  } else {
    const diff = Number(stats.growth?.diff) || 0;
    const percent = Number(stats.growth?.percent) || 0;
    const negative = diff < 0;
    const sign = diff > 0 ? "+" : negative ? "−" : "";
    const growthText = `${sign}${formatMoney(Math.abs(diff), currency)} (${sign}${Math.abs(percent).toFixed(1)}%)`;
    const max = stats.max;
    const iconSize = featured ? 22 : isCompact ? 16 : 20;

    const summaries: SummaryCardProps[] = [
      {
        icon: <Coins size={iconSize} />,
        tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        label: t("rent_stats.average_annual"),
        value: formatMoney(stats.average_annual, currency),
      },
      {
        icon: negative ? <TrendingDown size={iconSize} /> : <TrendingUp size={iconSize} />,
        tone: negative
          ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        label: t("rent_stats.growth", { from: shownFrom, to: shownTo }),
        value: growthText,
        negative,
      },
      {
        icon: <Trophy size={iconSize} />,
        tone: "bg-lime-50 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
        label: t("rent_stats.max"),
        value: max
          ? t("rent_stats.max_value", { value: formatMoney(max.total_calculated, currency), year: max.year })
          : "—",
      },
    ];

    const chartGrid = (
      <div className={`grid grid-cols-1 lg:grid-cols-3 ${isCompact ? "gap-3" : "gap-4"}`}>
        {charts.map((chart) => (
          <div
            key={chart.key}
            className={
              featured
                ? "rounded-2xl border border-white/10 bg-white/[0.06] p-3 sm:p-4 backdrop-blur-md"
                : isCompact
                  ? "rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-2.5 pt-2 pb-1.5"
                  : "rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 sm:p-4"
            }
          >
            <div className={`flex items-center justify-center gap-2 ${isCompact ? "mb-1" : "mb-2"}`}>
              <span
                className={`${isCompact ? "h-2 w-2" : "h-2.5 w-2.5"} rounded-full`}
                style={{ backgroundColor: featured ? FEATURED_COLORS[chart.key].from : chart.color }}
              />
              <p
                className={`${isCompact ? "text-xs" : "text-sm"} font-semibold ${
                  featured ? "text-slate-100" : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {chart.label}
              </p>
            </div>
            <div
              className={`${isCompact ? "h-[140px]" : "h-[220px]"} w-full ${
                featured ? "text-slate-300" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.years} margin={{ top: isCompact ? 4 : 8, right: 4, bottom: 0, left: 0 }}>
                  {featured && (
                    <defs>
                      <linearGradient id={`rent-grad-${chart.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={FEATURED_COLORS[chart.key].from} stopOpacity={1} />
                        <stop offset="100%" stopColor={FEATURED_COLORS[chart.key].to} stopOpacity={0.55} />
                      </linearGradient>
                    </defs>
                  )}
                  <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={featured ? 0.12 : 0.15} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: "currentColor", fontSize: isCompact ? 10 : 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "currentColor", strokeOpacity: 0.3 }}
                  />
                  <YAxis
                    width={isCompact ? 44 : 52}
                    tick={{ fill: "currentColor", fontSize: isCompact ? 10 : 11 }}
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
                    fill={featured ? `url(#rent-grad-${chart.key})` : chart.color}
                    radius={isCompact ? [4, 4, 0, 0] : [6, 6, 0, 0]}
                    maxBarSize={isCompact ? 30 : 44}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    );

    const summaryGrid = isCompact ? (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {summaries.map((card) => (
          <CompactChip key={card.label} {...card} />
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {summaries.map((card) =>
          featured ? <FeaturedKpi key={card.label} {...card} /> : <SummaryCard key={card.label} {...card} />,
        )}
      </div>
    );

    body = (
      <div
        className={`${isCompact ? "space-y-3" : "space-y-4"} transition-opacity ${
          isFetching ? "opacity-60" : "opacity-100"
        }`}
      >
        {isCompact ? (
          <>
            {summaryGrid}
            {!collapsed && chartGrid}
          </>
        ) : featured ? (
          <>
            {summaryGrid}
            {chartGrid}
          </>
        ) : (
          <>
            {chartGrid}
            {summaryGrid}
          </>
        )}
      </div>
    );
  }

  if (featured) {
    return (
      <section
        className={`relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900 p-5 shadow-xl sm:p-7 lg:rounded-3xl lg:p-8 ${className}`}
      >
        {/* fon: chuqur yashil gradient + yumshoq nur */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/90 to-slate-900" />
        <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 sm:h-14 sm:w-14">
                <Coins size={26} />
              </div>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                    {shownFrom}–{shownTo}
                  </span>
                </div>
                <h2 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
                  {title ?? t("rent_stats.title")}
                </h2>
                {subtitle && <p className="mt-1.5 max-w-2xl text-sm font-medium text-slate-300 sm:text-base">{subtitle}</p>}
              </div>
            </div>
            {filters}
          </div>
          {body}
        </div>
      </section>
    );
  }

  if (isCompact) {
    const heading = title ?? t("rent_stats.title");
    return (
      <section
        className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-3 sm:p-4 shadow-xs backdrop-blur-md transition-colors space-y-3 ${className}`}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            title={collapsed ? t("rent_stats.expand") : t("rent_stats.collapse")}
            className="group mr-auto flex min-w-0 items-center gap-2 rounded-lg text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Coins size={15} />
            </span>
            <h3 className="truncate text-sm sm:text-[15px] font-bold text-slate-800 dark:text-slate-100">
              {heading}{" "}
              <span className="font-medium text-slate-400 dark:text-slate-500">
                ({shownFrom}–{shownTo})
              </span>
            </h3>
            <ChevronDown
              size={16}
              className={`shrink-0 text-slate-400 transition-transform group-hover:text-emerald-600 dark:group-hover:text-emerald-400 ${
                collapsed ? "" : "rotate-180"
              }`}
            />
            <span className="sr-only">{collapsed ? t("rent_stats.expand") : t("rent_stats.collapse")}</span>
          </button>
          {!collapsed && filters}
        </div>
        <div id={bodyId}>{body}</div>
      </section>
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

function FilterField({
  label,
  children,
  featured = false,
  compact = false,
}: {
  label: string;
  children: ReactNode;
  featured?: boolean;
  compact?: boolean;
}) {
  return (
    <label className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
      <span
        className={`${compact ? "text-xs" : "text-xs sm:text-sm"} font-medium whitespace-nowrap ${
          featured ? "text-emerald-100/80" : "text-slate-500 dark:text-slate-400"
        }`}
      >
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
  negative?: boolean;
}

function SummaryCard({ icon, tone, label, value, negative }: SummaryCardProps) {
  const valueClass = negative ? "text-red-600 dark:text-red-400" : "";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p
          className={`text-base sm:text-lg font-bold tabular-nums break-words text-emerald-700 dark:text-emerald-400 ${valueClass}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function CompactChip({ icon, tone, label, value, negative }: SummaryCardProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400" title={label}>
          {label}
        </p>
        <p
          className={`truncate text-sm font-bold leading-snug tabular-nums ${
            negative ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
          }`}
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function FeaturedKpi({ icon, label, value, negative }: SummaryCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition-colors hover:bg-white/[0.09] sm:p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            negative ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p
            className={`mt-1 text-lg font-black tabular-nums tracking-tight break-words sm:text-xl ${
              negative ? "text-red-300" : "text-white"
            }`}
          >
            {value}
          </p>
        </div>
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

function CompactSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[50px] animate-pulse rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
          />
        ))}
      </div>
      {!collapsed && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[172px] animate-pulse rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatsSkeleton({ featured = false }: { featured?: boolean }) {
  if (featured) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[268px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
          ))}
        </div>
      </div>
    );
  }
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
