import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

// 📌 O‘rta yozuv uchun plugin
const centerTextPlugin = {
  id: "centerText",
  beforeDraw(chart: any) {
    const { width, height, ctx } = chart;
    ctx.restore();
    const fontSize = (height / 180).toFixed(2);
    ctx.font = `${fontSize}em Arial`;
    ctx.textBaseline = "middle";

    const text = "Жами 7,1 млн га";
    const textX = Math.round(width / 3);
    const textY = Math.round(height / 2);

    ctx.fillStyle = "#D92323"; // Qizil rang (rasmga o‘xshash)
    ctx.textAlign = "center";
    ctx.font = "bold 24px Arial";
    ctx.fillText(text, textX, textY);
    ctx.save();
  },
};

export default function PieChartLanding() {
  const data = {
    labels: [
      "Ўрмон билан қопланган ерлар",
      "Яйловлар",
      "Сийрак ва ёш ўрмонзорлар",
      "Суғориладиган экин ерлар",
      "Лалми ерлар",
      "Фойдаланилмаётган ерлар",
    ],
    datasets: [
      {
        label: "Yer turlari foizda",
        data: [42.9, 29.8, 14.5, 0.16, 0.1, 12.5],
        backgroundColor: [
          "#0066CC",
          "#F7931E",
          "#009245",
          "#C4D600",
          "#A04632",
          "#00AEEF",
        ],
        borderWidth: 2,
        borderColor: "#fff",
        hoverBorderColor: "#fff",
      },
    ],
  };

  const options = {
    responsive: true,
    cutout: "60%",
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          font: {
            size: 13,
            family: "Arial",
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.formattedValue;
            return `${label}: ${value}%`;
          },
        },
      },
      title: {
        display: false, // 🔕 endi kerak emas, o‘rtada yozuv bor
      },
    },
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
    </div>
  );
}
