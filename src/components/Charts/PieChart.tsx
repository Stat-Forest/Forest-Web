"use client";

import { RootState } from "@/app/store";
import { useGetLandStatisticsQuery } from "@/services/generalApi";
import { useSelector } from "react-redux";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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

type TooltipValue = number | string;

export default function PieChartLanding() {
  const lang = useSelector((state: RootState) => state.language.lang);

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

  const formatValue = (value: number) =>
    `${value.toFixed(2).replace(".", ",")} mln ga`;

  const getArea = (item: StatItem): number => {
    const value = Number(item.area ?? item.land_area ?? item.value ?? 0);
    return Number.isFinite(value) ? value : 0;
  };

  if (isLoading) {
    return (
      <div className="w-full rounded-3xl border border-white/20 bg-white/10 px-4 py-8 shadow-sm backdrop-blur-sm sm:px-5 sm:py-10">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          <p className="text-sm font-medium text-white/90">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full rounded-3xl border border-white/20 bg-white/10 px-4 py-8 text-center shadow-sm backdrop-blur-sm sm:px-5 sm:py-10">
        <p className="text-sm font-medium text-white/90">
          Statistika yuklanmadi. Tizimga kiring.
        </p>
      </div>
    );
  }

  const rawItems = data?.items ?? data?.results ?? [];
  const items: StatItem[] = Array.isArray(rawItems) ? rawItems : [];

  const filteredItems = items.filter((item) => getArea(item) > 0);

  const total = filteredItems.reduce((sum, item) => sum + getArea(item), 0);

  const chartData = filteredItems.map((item) => ({
    name: item.name ?? item.title ?? item.column_name ?? "Noma'lum",
    value: getArea(item),
  }));

  if (chartData.length === 0) {
    return (
      <div className="w-full rounded-3xl border border-white/20 bg-white/10 px-4 py-8 text-center shadow-sm backdrop-blur-sm sm:px-5 sm:py-10">
        <p className="text-sm font-medium text-white/90">
          Ma&apos;lumot mavjud emas
        </p>
      </div>
    );
  }

  return (
    <section className="w-full rounded-[28px] border border-white/15 bg-white/10 p-3 shadow-sm backdrop-blur-md sm:p-4 lg:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        {/* Chart */}
        <div className="relative min-w-0 flex-1 rounded-[24px] bg-white/10 p-2 sm:p-3">
          <div className="mx-auto h-[240px] w-full sm:h-[280px] md:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value: TooltipValue) =>
                    formatValue(Number(value) || 0)
                  }
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
                    background: "rgba(255,255,255)",
                    color: "#000",
                  }}
                />

                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={3}
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={2}
                  labelLine={false}
                >
                  {chartData.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 sm:text-xs">
              Jami
            </span>

            <span className="mt-2 text-xl font-extrabold leading-none text-white sm:text-2xl md:text-3xl">
              {total.toFixed(3).replace(".", ",")}
            </span>

            <span className="mt-1 text-xs font-bold text-white/80 sm:text-sm">
              mln ga
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full xl:max-w-[340px]">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {chartData.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 transition-all duration-200 hover:bg-white/15"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white/20"
                    style={{
                      backgroundColor: COLORS[idx % COLORS.length],
                    }}
                  />
                  <span className="line-clamp-2 text-xs font-medium leading-5 text-white sm:text-sm">
                    {item.name}
                  </span>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-sm font-extrabold text-white sm:text-base">
                    {item.value.toFixed(2).replace(".", ",")}
                  </div>
                  <div className="text-[10px] font-semibold text-white/70 sm:text-xs">
                    mln ga
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
