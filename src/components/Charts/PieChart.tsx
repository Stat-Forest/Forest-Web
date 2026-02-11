"use client";

import { RootState } from "@/app/store";
import { useGetLandStatisticsQuery } from "@/services/generalApi";
import { useSelector } from "react-redux";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function PieChartLanding() {
  const lang = useSelector((state: RootState) => state.language.lang);
  const { data, isLoading } = useGetLandStatisticsQuery({ lang });

  const COLORS = [
    "#2563EB",
    "#F59E0B",
    "#16A34A",
    "#A3E635",
    "#EA580C",
    "#06B6D4",
  ];

  if (isLoading) {
    return <div className="text-center py-10">Yuklanmoqda...</div>;
  }

  const items = data?.items || [];

  // ❗ 0 qiymatlarni olib tashlaymiz
  const filteredItems = items.filter((item: any) => item.area > 0);

  const total = filteredItems.reduce((sum: number, i: any) => sum + i.area, 0);

  const chartData = filteredItems.map((item: any) => ({
    name: item.name,
    value: item.area,
  }));

  /* ============================
     Slice label (%)
  ============================ */
  const renderLabel = ({ cx, cy, midAngle, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 18;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const displayPercent = (percent * 100).toFixed(1);

    return (
      <foreignObject x={x - 26} y={y - 16} width={52} height={32}>
        <div className="bg-white rounded-full shadow px-2 py-0.5 text-xs font-bold text-black text-center">
          {displayPercent}%
        </div>
      </foreignObject>
    );
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-center">
      {/* ================= CHART ================= */}
      <div className="relative w-[700px] h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(value: number) =>
                `${value.toFixed(2).replace(".", ",")} mln ga`
              }
            />

            <Pie
              data={chartData}
              dataKey="value"
              innerRadius={95}
              outerRadius={135}
              paddingAngle={3}
              labelLine={false}
              label={renderLabel}
            >
              {chartData.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* ================= CENTER TEXT ================= */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-xl font-bold text-black">
            {data?.title?.split(" ")[0] || "Жами"}
          </span>

          <span className="text-5xl font-extrabold text-red-600 leading-none">
            {total.toFixed(3).replace(".", ",")}
          </span>

          <span className="text-xl font-bold text-blue-600">mln ga</span>
        </div>
      </div>

      {/* ================= LEGEND ================= */}
      <div className="w-full max-w-xl space-y-5">
        {chartData.map((item: any, idx: number) => {
          return (
            <div key={idx} className="flex justify-between items-center gap-4">
              <div className="flex items-start gap-3">
                <span
                  className="w-4 h-4 rounded-full mt-1"
                  style={{
                    backgroundColor: COLORS[idx % COLORS.length],
                  }}
                />
                <span className="text-sm font-medium text-black leading-snug">
                  {item.name}
                </span>
              </div>

              <div className="text-right whitespace-nowrap">
                <span className="text-xl font-extrabold text-red-600">
                  {item.value}
                </span>{" "}
                <span className="text-md font-bold text-blue-600">mln ga</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
