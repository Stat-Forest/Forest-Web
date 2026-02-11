"use client";

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
import langin_icon from "@/assets/Group 1321321334.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetLoginStatDeadlineQuery } from "@/services/reportsApi";
import { useTranslation } from "react-i18next";

/* ---------------- TYPES ---------------- */
type StatItem = {
  column_name: string;
  unit: string;
  plan: number;
  actual: number;
  percentage: number;
  status?: string;
};

/* ---------------- ICON CONFIG (CANONICAL UZ KEYS) ---------------- */
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

/* ---------------- RU → UZ NORMALIZER ---------------- */
const NAME_MAP: Record<string, string> = {
  "Земли, покрытые лесом": "O'rmon bilan qoplangan yer maydonlari",
  "Освоение лесных земель":
    "O'rmon yerlarini o'zlashtirib, foydalanishga kiritish",
  "Создание плантаций лекарственных растений":
    "Dorivor o'simliklar plantatsiyalarini barpo etish",
  "Подготовка сырья лекарственных растений":
    "Dorivor o'simliklar xomashyosini tayyorlash",
  "Создание защитных лесопосадок в пустынных и горных районах":
    "Cho'l, tog'li va tog'oldi hududlarida himoya o'rmonzorlari (ihota) barpo etish",
  "Создание питомников и рассадников":
    "Niholxona va ko'chatchonalar tashkil etish",
  "Создание зелёного покрытия в Приаральском и других пустынных районах":
    "Orolbo'yi mintaqasi va boshqa cho'l hududlarida yashil qoplama barpo etish",
  "В том числе выращивание шелковичных саженцев":
    "Jumladan, tut ko'chatlari yetishtirish",
};

const normalizeName = (name: string) => NAME_MAP[name] ?? name;

/* ---------------- PAGE ---------------- */
export default function Landing() {
  const lang = useSelector((state: RootState) => state.language.lang);
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");
  const { t } = useTranslation();

  const { data: month = [] } = useGetLoginStatsQuery({
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
      <AuthHeader position />

      <div className="max-w-[1800px] mx-auto px-6 py-10">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row items-center gap-6 mb-10">
          <div className="flex items-center gap-6">
            <img src={langin_icon} alt="icon" />
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {t("landing_1")}
            </h1>
          </div>

          <div className="lg:w-[60%] w-full bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">{t("landing_4")}</h2>
            <PieChartLanding />
          </div>
        </div>

        {/* YEARLY */}
        <Section
          title={t("landing_2")}
          value={yearly}
          onChange={setYearly}
          options={deadlineYear?.results}
          data={year}
        />

        {/* MONTHLY */}
        <Section
          title={t("landing_3")}
          value={monthly}
          onChange={setMonthly}
          options={deadlineMonth?.results}
          data={month}
        />
      </div>
    </div>
  );
}

/* ---------------- REUSABLE SECTION ---------------- */
function Section({ title, value, onChange, options, data }: any) {
  return (
    <>
      <div className="flex items-center gap-6 py-6">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

        <Select onValueChange={onChange} value={value}>
          <SelectTrigger className="min-w-[200px]">
            <SelectValue placeholder="Tanlang" />
          </SelectTrigger>
          <SelectContent>
            {options?.map((item: any, idx: number) => (
              <SelectItem key={idx} value={item.submit_at}>
                {item.submit_at}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {data?.length > 0 ? (
          data.map((item: StatItem, idx: number) => (
            <StatCard key={idx} item={item} />
          ))
        ) : (
          <p className="text-gray-500 col-span-full">Ma'lumot mavjud emas</p>
        )}
      </div>
    </>
  );
}

/* ---------------- CARD ---------------- */
function StatCard({ item }: { item: StatItem }) {
  const percent =
    item.plan > 0 ? Math.min(Math.round(item.percentage), 100) : 0;

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

  const normalizedName = normalizeName(item.column_name);
  const meta = CARD_META[normalizedName];

  const Icon = meta?.icon ?? Leaf;
  const iconBg = meta?.iconBg ?? "bg-gray-100 text-gray-600";

  return (
    <div className="bg-[#F1F7E8] border border-green-200 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition">
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center ${iconBg}`}
      >
        <Icon size={24} />
      </div>

      <p className="text-sm font-semibold text-gray-900">{item.column_name}</p>

      <p className="text-3xl font-extrabold text-red-600">
        {item.actual.toLocaleString()}
        <span className="text-base font-bold text-blue-600 ml-2">
          {item.unit}
        </span>
      </p>

      <div className="flex justify-between text-sm">
        <span className="text-gray-600">
          Reja: {item.plan.toLocaleString()} {item.unit}
        </span>
        <span className={`font-bold ${statusColor}`}>{percent}%</span>
      </div>

      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${progressBarColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
