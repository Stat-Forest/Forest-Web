import AuthHeader from "@/components/Header/AuthHeader";
import { useGetLoginStatsQuery } from "@/services/statistikApi";
import {
  Leaf,
  Trees,
  Sprout,
  Pill,
  Shield,
  Warehouse,
  Droplets,
  TreePine,
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { useState } from "react";
import PieChartLanding from "@/components/Charts/PieChart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetLoginStatDeadlineQuery } from "@/services/reportsApi";

/* ---------------- ICON CONFIG ---------------- */
const CARD_META: Record<string, { icon: any; iconBg: string }> = {
  "O'rmon bilan qoplangan yer maydonlari": {
    icon: Trees,
    iconBg: "bg-green-100 text-green-700",
  },
  "O'rmon yerlarini o'zlashtirib, foydalanishga kiritish": {
    icon: Leaf,
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  "Dorivor o'simliklar plantatsiyalarini barpo etish": {
    icon: Sprout,
    iconBg: "bg-lime-100 text-lime-700",
  },
  "Dorivor o'simliklar xomashyosini tayyorlash": {
    icon: Pill,
    iconBg: "bg-yellow-100 text-yellow-700",
  },
  "Cho'l, tog'li va tog'oldi hududlarida himoya o'rmonzorlari (ihota) barpo etish":
    {
      icon: Shield,
      iconBg: "bg-teal-100 text-teal-700",
    },
  "Niholxona va ko'chatchonalar tashkil etish": {
    icon: Warehouse,
    iconBg: "bg-sky-100 text-sky-700",
  },
  "Orolbo'yi mintaqasi va boshqa cho'l hududlarida yashil qoplama barpo etish":
    {
      icon: Droplets,
      iconBg: "bg-cyan-100 text-cyan-700",
    },
  "Jumladan, tut ko'chatlari yetishtirish": {
    icon: TreePine,
    iconBg: "bg-green-100 text-green-800",
  },
};

/* ---------------- TYPES ---------------- */
type StatItem = {
  column_name: string;
  unit: string;
  plan: number;
  actual: number;
  percentage: number;
  status?: string;
};

/* ---------------- PAGE ---------------- */
export default function Landing() {
  const lang = useSelector((state: RootState) => state.language.lang);
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");

  const { data: month = [], } = useGetLoginStatsQuery({
    lang,
    monthly,
    statement_status: "month",
    yearly: "",
  });

  const { data: year = [] } = useGetLoginStatsQuery({
    lang,
    monthly: "",
    statement_status: "year",
    yearly,
  });

  const { data: deadlineMonth } = useGetLoginStatDeadlineQuery({
    period_type: "monthly",
  });
  const { data: deadlineYear } = useGetLoginStatDeadlineQuery({
    period_type: "yearly",
  });

  return (
    <div className="min-h-screen bg-[#F4FAF3]">
      {/* HEADER */}
      <AuthHeader />

      <div className="max-w-[1400px] mx-auto px-6 py-10">
        {/* TOP SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-8 mb-10">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-snug">
            Ўрмон агентлиги томонидан амалга оширилган тадбир кўрсаткичлари
          </h1>

          <div className="lg:col-span-2 bg-white border border-gray-300 rounded-2xl p-6">
            <PieChartLanding />
          </div>
        </div>

        {/* YEARLY CARDS */}
        <div className="flex items-center gap-10 py-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Yillik ko‘rsatkichlar
          </h2>
          <Select onValueChange={setYearly} value={yearly}>
            <SelectTrigger>
              <SelectValue placeholder="Yilni tanlang" />
            </SelectTrigger>
            <SelectContent>
              {deadlineYear?.results?.map((item: any, idx: number) => (
                <SelectItem key={idx} value={item.submit_at}>
                  {item.submit_at}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {year.length > 0 ? (
            year.map((item: StatItem, idx: number) => (
              <StatCard key={idx} item={item} />
            ))
          ) : (
            <p className="text-gray-500 col-span-full">Ma'lumot mavjud emas</p>
          )}
        </div>
        <br />
        {/* MONTHLY CARDS */}
        <div className="flex items-center gap-10 py-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Oylik ko‘rsatkichlar
          </h2>
          <Select onValueChange={setMonthly} value={monthly}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue placeholder="Oylikni tanlang" />
            </SelectTrigger>
            <SelectContent>
              {deadlineMonth?.results?.map((item: any, idx: number) => (
                <SelectItem key={idx} value={item.submit_at}>
                  {item.submit_at}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {month.length > 0 ? (
            month.map((item: StatItem, idx: number) => (
              <StatCard key={idx} item={item} />
            ))
          ) : (
            <p className="text-gray-500 col-span-full">Ma'lumot mavjud emas</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- CARD COMPONENT ---------------- */
function StatCard({ item }: { item: StatItem }) {
  const percent =
    item.plan > 0 ? Math.min(Math.round(item.percentage), 100) : 0;

  // Color for text and progress bar
  const statusColor =
    percent >= 100
      ? "text-green-700"
      : percent >= 80
        ? "text-blue-700"
        : percent >= 50
          ? "text-yellow-700"
          : "text-red-700";

  const progressBarColor =
    percent >= 100
      ? "bg-green-600"
      : percent >= 80
        ? "bg-blue-600"
        : percent >= 50
          ? "bg-yellow-500"
          : "bg-red-500";

  const meta = CARD_META[item.column_name];
  const Icon = meta?.icon ?? Leaf; // fallback icon
  const iconBg = meta?.iconBg ?? "bg-gray-100 text-gray-600";

  return (
    <div className="bg-[#F1F7E8] border border-green-200 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition">
      {/* ICON */}
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}
      >
        <Icon size={22} strokeWidth={2} />
      </div>

      {/* TITLE */}
      <p className="text-sm font-semibold text-gray-900 leading-snug">
        {item.column_name}
      </p>

      {/* VALUE */}
      <p className="text-3xl font-extrabold text-red-600 leading-none">
        {item.actual.toLocaleString()}
        <span className="text-base font-bold text-blue-600 ml-2">
          {item.unit}
        </span>
      </p>

      {/* PROGRESS */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">
          Reja: {item.plan.toLocaleString()} {item.unit}
        </span>
        <span className={`font-bold ${statusColor}`}>{percent}%</span>
      </div>

      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${progressBarColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
