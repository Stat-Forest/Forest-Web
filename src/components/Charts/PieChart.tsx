"use client";

import { useGetLandStatisticsQuery } from "@/services/generalApi";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function PieChartLanding() {
  const { data, isLoading } = useGetLandStatisticsQuery({ lang: "uz" });

  const COLORS = [
    "#2563EB", // ko‘k
    "#F59E0B", // sariq
    "#16A34A", // yashil
    "#A3E635", // och yashil
    "#EA580C", // to‘q sariq
    "#06B6D4", // moviy
  ];

  if (isLoading) {
    return <div className="text-center">Yuklanmoqda...</div>;
  }

  const items = data?.items || [];

  const total = items.reduce((sum: number, i: any) => sum + i.area, 0);

  const chartData = items.map((item: any) => ({
    name: item.name,
    value: item.area,
    percent: ((item.area / total) * 100).toFixed(1),
  }));

  /* ============================
     % badge for slice
  ============================ */
  const renderLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 18;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <foreignObject x={x - 26} y={y - 16} width={52} height={32}>
        <div className="bg-white rounded-full shadow px-2 py-0.5 text-xs font-bold text-black text-center">
          {(percent * 100).toFixed(1)}%
        </div>
      </foreignObject>
    );
  };

  return (
    <div className="flex flex-col xl:flex-row gap-5 items-center">
      {/* ===== CHART ===== */}
      <div className="relative w-[700px] h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius={95}
              outerRadius={135}
              labelLine={false}
              label={renderLabel}
            >
              {chartData.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* ===== CENTER TEXT ===== */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-xl font-bold text-black">Жами</span>
          <span className="text-5xl font-extrabold text-red-600 leading-none">
            {total.toFixed(1)}
          </span>
          <span className="text-xl font-bold text-blue-600">млн га</span>
        </div>
      </div>

      {/* ===== LEGEND ===== */}
      <div className="w-full max-w-xl space-y-5">
        {chartData.map((item: any, idx: number) => {
          const isMillion = item.value >= 1;
          const valueText = isMillion
            ? item.value.toFixed(2)
            : (item.value * 1000).toFixed(1);

          const unit = isMillion ? "млн га" : "минг га";

          return (
            <div key={idx} className="flex justify-between items-center gap-4">
              <div className="flex items-start gap-2">
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
                  {valueText.replace(".", ",")}
                </span>{" "}
                <span className="text-md font-bold text-blue-600">{unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
