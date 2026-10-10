/**
 * recharts'ga bog'liq grafiklar — ReportStatsSection bularni `lazy()` bilan yuklaydi
 * (recharts bosh bundle'ga tushmasin).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OverviewDiscipline, OverviewMonth, OverviewRegion, ReportStatusKey } from "@/types/dashboardOverview";
import {
  DISCIPLINE_KEYS,
  STATUS_ORDER,
  disciplineColors,
  useChartTheme,
  useFormatters,
  type DisciplineKey,
} from "./theme";

type TooltipRow = { key: string; label: string; color: string; value: number };

function TooltipBox({ title, rows, total }: { title: string; rows: TooltipRow[]; total?: number }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md min-w-[170px] pointer-events-none">
      <p className="font-bold text-slate-800 dark:text-slate-100 mb-1.5 capitalize">{title}</p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: r.color }} />
              {r.label}
            </span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{fmt.num(r.value)}</span>
          </div>
        ))}
      </div>
      {total !== undefined && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
          <span>{t("report_stats.total_col")}</span>
          <span className="tabular-nums">{fmt.num(total)}</span>
        </div>
      )}
    </div>
  );
}

function statusRows(
  payload: Record<ReportStatusKey, number>,
  colors: Record<ReportStatusKey, string>,
  t: (k: string) => string,
) {
  // Tooltip tartibi — yuqoridagi segment birinchi
  return [...STATUS_ORDER].reverse().map((s) => ({
    key: s,
    label: t(`report_stats.status.${s}`),
    color: colors[s],
    value: payload[s] ?? 0,
  }));
}

/** Oylik dinamika: holatlar bo'yicha stacked bar (12 oy). */
export function MonthlyTrendChart({ data }: { data: OverviewMonth[] }) {
  const { t } = useTranslation();
  const theme = useChartTheme();
  const fmt = useFormatters();
  const top = STATUS_ORDER[STATUS_ORDER.length - 1];

  return (
    // lg: qo'shni (intizom) panel balandligiga cho'ziladi
    <div className="h-[260px] lg:h-auto lg:flex-1 lg:min-h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickFormatter={fmt.monthTick}
            tick={{ fill: theme.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={4}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: theme.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: theme.cursor }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={fmt.monthLong((payload[0].payload as OverviewMonth).month)}
                  rows={statusRows(payload[0].payload as OverviewMonth, theme.status, t)}
                  total={(payload[0].payload as OverviewMonth).total}
                />
              ) : null
            }
          />
          {STATUS_ORDER.map((s) => (
            <Bar
              key={s}
              dataKey={s}
              stackId="status"
              fill={theme.status[s]}
              stroke={theme.surface}
              strokeWidth={1}
              radius={s === top ? [4, 4, 0, 0] : 0}
              maxBarSize={34}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Muddat intizomi: donut + markazda "muddatida" foizi. */
export function DisciplineDonut({ data }: { data: OverviewDiscipline }) {
  const { t } = useTranslation();
  const theme = useChartTheme();
  const fmt = useFormatters();
  const colors = disciplineColors(theme.status);
  const [active, setActive] = useState<DisciplineKey | null>(null);
  const slices = DISCIPLINE_KEYS.map((k) => ({
    key: k,
    name: t(`report_stats.discipline.${k}`),
    value: data[k],
  })).filter((s) => s.value > 0);
  const focus = active ? slices.find((s) => s.key === active) : null;

  return (
    <div className="relative h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="92%"
            paddingAngle={slices.length > 1 ? 2 : 0}
            stroke={theme.surface}
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
            onMouseEnter={(_, index) => setActive(slices[index]?.key ?? null)}
            onMouseLeave={() => setActive(null)}
          >
            {slices.map((s) => (
              <Cell key={s.key} fill={colors[s.key]} opacity={active && active !== s.key ? 0.45 : 1} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        {focus ? (
          <>
            <span className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {fmt.num(focus.value)}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 max-w-[96px] leading-tight">
              {focus.name} · {fmt.pct(data.total ? (focus.value * 100) / data.total : 0)}
            </span>
          </>
        ) : (
          <>
            <span className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {fmt.pct(data.on_time_rate)}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {t("report_stats.on_time_rate")}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** Hududlar kesimi: gorizontal stacked bar. */
export function RegionChart({
  data,
  regionLabel,
}: {
  data: OverviewRegion[];
  regionLabel: (code: string, fallback: string) => string;
}) {
  const { t } = useTranslation();
  const theme = useChartTheme();
  const rows = data.map((r) => ({ ...r, label: regionLabel(r.code, r.name) }));
  const top = STATUS_ORDER[STATUS_ORDER.length - 1];

  return (
    <div className="w-full" style={{ height: Math.max(160, rows.length * 34 + 24) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid horizontal={false} stroke={theme.grid} strokeDasharray="3 3" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: theme.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={118}
            tick={{ fill: theme.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: theme.cursor }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as OverviewRegion & { label: string };
              return <TooltipBox title={row.label} rows={statusRows(row, theme.status, t)} total={row.total} />;
            }}
          />
          {STATUS_ORDER.map((s) => (
            <Bar
              key={s}
              dataKey={s}
              stackId="status"
              fill={theme.status[s]}
              stroke={theme.surface}
              strokeWidth={1}
              radius={s === top ? [0, 4, 4, 0] : 0}
              maxBarSize={20}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
