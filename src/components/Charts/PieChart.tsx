"use client";

import { useState } from "react";
import { RootState } from "@/app/store";
import { useGetLandStatisticsQuery } from "@/services/generalApi";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";

type StatItem = {
  name?: string;
  title?: string;
  column_name?: string;
  area?: number | string;
  land_area?: number | string;
  value?: number | string;
};

type LandStatisticsResponse = {
  title?: string;
  items?: StatItem[];
  results?: StatItem[];
};

export default function PieChartLanding() {
  const { t } = useTranslation();
  const lang = useSelector((state: RootState) => state.language.lang);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { data, isLoading, isError } = useGetLandStatisticsQuery(
    { lang },
    {
      selectFromResult: ({ data, isLoading, isError }) => ({
        data: data as LandStatisticsResponse | undefined,
        isLoading,
        isError,
      }),
    },
  );

  const COLORS = [
    "#2563EB",
    "#F59E0B",
    "#16A34A",
    "#A3E635",
    "#EA580C",
    "#06B6D4",
    "#8B5CF6",
    "#EC4899",
  ];

  const getArea = (item: StatItem): number => {
    const value = Number(item.area ?? item.land_area ?? item.value ?? 0);
    return Number.isFinite(value) ? value : 0;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const val = Number(item.value) || 0;
      return (
        <div className="z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap pointer-events-none">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: item.payload.fill || item.color }}
          />
          <span className="text-slate-600 dark:text-slate-400">{item.name}:</span>
          <span className="font-black text-slate-900 dark:text-white">
            {val.toFixed(2).replace(".", ",")} {t("pie_unit")}
          </span>
        </div>
      );
    }
    return null;
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 3}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke="#ffffff"
          strokeWidth={3}
          style={{ filter: "drop-shadow(0px 6px 12px rgba(15, 23, 42, 0.18))" }}
        />
      </g>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-8 shadow-sm sm:px-5 sm:py-10">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-[#00BC7D]" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-8 text-center shadow-sm sm:px-5 sm:py-10">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {t("stats_load_error")}
        </p>
      </div>
    );
  }

  const rawItems = data?.items ?? data?.results ?? [];
  const items: StatItem[] = Array.isArray(rawItems) ? rawItems : [];

  const filteredItems = items.filter((item) => getArea(item) > 0);

  const total = filteredItems.reduce((sum, item) => sum + getArea(item), 0);

  const chartData = filteredItems.map((item) => ({
    name: item.name ?? item.title ?? item.column_name ?? t("landing_unknown"),
    value: getArea(item),
  }));

  if (chartData.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-8 text-center shadow-sm sm:px-5 sm:py-10">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {t("noData")}
        </p>
      </div>
    );
  }

  const activeItem = activeIndex !== null ? chartData[activeIndex] : null;
  const activePercent = activeItem && total > 0 ? Math.round((activeItem.value / total) * 100) : 0;

  return (
    <section className="w-full h-full flex flex-col justify-between">
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-black text-slate-800 dark:text-white sm:text-lg">
            {t("pie_title")}
          </h3>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-400">
            {t("pie_subtitle")}
          </p>
        </div>
        {activeIndex !== null ? (
          <button
            onClick={() => setActiveIndex(null)}
            className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
          >
            {t("pie_all")}
          </button>
        ) : (
          <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
            {t("pie_analysis")}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch flex-1">
        {/* Chart */}
        <div className="relative min-w-0 flex-1 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-2 sm:p-3 flex flex-col justify-center items-center">
          <div className="mx-auto h-full min-h-[220px] w-full sm:min-h-[250px] md:min-h-[270px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={<CustomTooltip />}
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ zIndex: 1000, outline: "none" }}
                />

                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={1.5}
                  minAngle={6}
                  stroke="#ffffff"
                  strokeWidth={2}
                  labelLine={false}
                  activeIndex={activeIndex !== null ? activeIndex : undefined}
                  activeShape={renderActiveShape}
                  onClick={(_, index) =>
                    setActiveIndex((prev) => (prev === index ? null : index))
                  }
                >
                  {chartData.map((_, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={COLORS[i % COLORS.length]}
                      opacity={activeIndex === null || activeIndex === i ? 1 : 0.25}
                      className="transition-all duration-300 cursor-pointer"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
            {activeItem ? (
              <>
                <span
                  className="line-clamp-1 max-w-[130px] text-[10px] font-bold uppercase tracking-wider transition-all sm:text-xs"
                  style={{ color: COLORS[activeIndex! % COLORS.length] }}
                >
                  {activeItem.name}
                </span>

                <span className="mt-1 text-xl font-black leading-none text-slate-900 dark:text-white sm:text-2xl md:text-3xl">
                  {activeItem.value.toFixed(2).replace(".", ",")}
                </span>

                <span className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400 sm:text-sm">
                  {activePercent}% ({activeItem.value < 0.1 ? activeItem.value.toFixed(2) : activeItem.value.toFixed(1)} {t("pie_unit")})
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400 sm:text-xs">
                  {t("pie_total")}
                </span>

                <span className="mt-1 text-xl font-black leading-none text-slate-900 dark:text-white sm:text-2xl md:text-3xl">
                  {total.toFixed(3).replace(".", ",")}
                </span>

                <span className="mt-1 text-xs font-bold text-[#00BC7D] sm:text-sm">
                  {t("pie_unit")}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="w-full xl:max-w-[320px]">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {chartData.map((item, idx) => {
              const isSelected = activeIndex === idx;
              const isDimmed = activeIndex !== null && !isSelected;
              return (
                <div
                  key={`${item.name}-${idx}`}
                  onClick={() =>
                    setActiveIndex((prev) => (prev === idx ? null : idx))
                  }
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-all duration-250 ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/50 shadow-md ring-2 ring-emerald-500/25 scale-[1.02]"
                      : isDimmed
                      ? "border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 opacity-45"
                      : "border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`h-3 w-3 shrink-0 rounded-full transition-transform duration-200 ${
                        isSelected ? "scale-125 ring-2 ring-emerald-400/50" : "ring-2 ring-white dark:ring-slate-800 shadow-xs"
                      }`}
                      style={{
                        backgroundColor: COLORS[idx % COLORS.length],
                      }}
                    />
                    <span
                      className={`line-clamp-2 text-xs leading-4 ${
                        isSelected
                          ? "font-bold text-emerald-800 dark:text-emerald-300"
                          : "font-semibold text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>

                  <div className="shrink-0 text-right">
                    <div
                      className={`text-xs font-black sm:text-sm ${
                        isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {item.value.toFixed(2).replace(".", ",")}
                    </div>
                    <div className={`text-[9px] font-bold uppercase tracking-wider ${ isSelected ? "text-emerald-400" : "text-slate-400" }`}>
                      {t("pie_unit")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
