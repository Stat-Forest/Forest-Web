"use client";

import React, { ReactNode, useState } from "react";
import AuthHeader from "@/components/Header/AuthHeader";
import { useGetLoginStatsQuery } from "@/services/statistikApi";
import { useGetLoginStatDeadlineQuery } from "@/services/reportsApi";
import PieChartLanding from "@/components/Charts/PieChart";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import {
  Leaf,
  Trees,
  Sprout,
  Pill,
  ArrowUpRight,
  Target,
  Calendar,
  Layers,
  Filter,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatCardItem = {
  column_name?: string;
  actual?: number;
  percentage?: number;
  unit?: string;
  plan?: number;
};

type DeadlineOption = {
  submit_at: string;
};

type DeadlineResponse = {
  results?: DeadlineOption[];
};

const formatNumber = (val: number) =>
  new Intl.NumberFormat("uz-UZ").format(val || 0);

const CARD_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    gradient: string;
  }
> = {
  "O'rmon bilan qoplangan yer maydonlari": {
    icon: Trees,
    color: "#10b981",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  "O'rmon yerlarini o'zlashtirib, foydalanishga kiritish": {
    icon: Leaf,
    color: "#22c55e",
    gradient: "from-green-500/20 to-green-500/5",
  },
  "Dorivor o'simliklar plantatsiyalarini barpo etish": {
    icon: Sprout,
    color: "#84cc16",
    gradient: "from-lime-500/20 to-lime-500/5",
  },
  "Dorivor o'simliklar xomashyosini tayyorlash": {
    icon: Pill,
    color: "#f59e0b",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  default: {
    icon: Target,
    color: "#64748b",
    gradient: "from-slate-500/20 to-slate-500/5",
  },
};

export default function ModernLanding() {
  const lang = useSelector((state: RootState) => state.language.lang);
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");

  const { data: monthData } = useGetLoginStatsQuery({
    lang,
    monthly,
    statement_status: "month",
    yearly: "",
  });

  const { data: yearData } = useGetLoginStatsQuery({
    lang,
    monthly: "",
    statement_status: "year",
    yearly,
  });

  const { data: deadlineMonthData } = useGetLoginStatDeadlineQuery({
    period_type: "monthly",
  });

  const { data: deadlineYearData } = useGetLoginStatDeadlineQuery({
    period_type: "yearly",
  });

  const month: StatCardItem[] = Array.isArray(monthData)
    ? (monthData as StatCardItem[])
    : [];

  const year: StatCardItem[] = Array.isArray(yearData)
    ? (yearData as StatCardItem[])
    : [];

  const deadlineMonth = deadlineMonthData as DeadlineResponse | undefined;
  const deadlineYear = deadlineYearData as DeadlineResponse | undefined;

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <AuthHeader position />

      <main className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
        <div className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-12 xl:gap-6">
          <div className="relative col-span-1 overflow-hidden rounded-[28px] border border-white bg-white p-6 shadow-sm sm:p-8 lg:col-span-7 lg:rounded-[40px] lg:p-10 flex flex-col justify-center">
            <div className="absolute right-0 top-0 p-8 opacity-10 sm:p-10 lg:p-12">
              <Trees size={180} className="text-emerald-600 sm:size-[220px]" />
            </div>

            <div className="relative z-10">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 sm:text-xs">
                  Platforma tahlili
                </span>
              </div>

              <h1 className="text-3xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                O‘rmon xo‘jaligi <br />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  statistika portali
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-base font-medium leading-relaxed text-slate-500 sm:text-lg">
                Ma&apos;lumotlar vizualizatsiyasi orqali reja va natijalarni
                real vaqt rejimida boshqaring.
              </p>
            </div>
          </div>

          <div className="col-span-1 flex min-h-[320px] flex-col justify-between rounded-[28px] bg-emerald-600 p-4 text-white shadow-xl shadow-emerald-100 sm:min-h-[360px] sm:p-6 lg:col-span-5 lg:rounded-[40px] lg:p-8">
            <div className="h-full w-full">
              <PieChartLanding />
            </div>
          </div>
        </div>

        <div className="space-y-12 sm:space-y-14 lg:space-y-16">
          <SectionLayout
            title="Strategik ko'rsatkichlar"
            subtitle="Yillik rejalashtirilgan ishlar natijalari"
            icon={<Layers className="text-emerald-600" />}
            value={yearly}
            onChange={setYearly}
            options={deadlineYear?.results ?? []}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-8">
              {year.map((item, idx) => (
                <ModernStatCard
                  key={`${item.column_name ?? "year"}-${idx}`}
                  item={item}
                />
              ))}
            </div>
          </SectionLayout>

          <SectionLayout
            title="Operatsion tahlil"
            subtitle="Oylik dinamika va bajarilish darajasi"
            icon={<Calendar className="text-blue-600" />}
            value={monthly}
            onChange={setMonthly}
            options={deadlineMonth?.results ?? []}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-8">
              {month.map((item, idx) => (
                <ModernStatCard
                  key={`${item.column_name ?? "month"}-${idx}`}
                  item={item}
                />
              ))}
            </div>
          </SectionLayout>
        </div>
      </main>
    </div>
  );
}

type SectionLayoutProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: DeadlineOption[];
  children: ReactNode;
};

function SectionLayout({
  title,
  subtitle,
  icon,
  value,
  onChange,
  options,
  children,
}: SectionLayoutProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end md:gap-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm sm:h-14 sm:w-14 sm:rounded-3xl">
            {icon}
          </div>

          <div>
            <h2 className="text-xl font-black leading-none tracking-tight text-slate-800 sm:text-2xl">
              {title}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="group relative w-full md:w-auto">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-100 to-blue-100 opacity-0 blur-lg transition group-hover:opacity-100" />
          <Select onValueChange={onChange} value={value}>
            <SelectTrigger className="relative h-12 w-full rounded-2xl border-none bg-white px-4 font-bold shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500 sm:h-14 sm:px-6 md:w-[280px]">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-400" />
                <SelectValue placeholder="Davrni tanlang" />
              </div>
            </SelectTrigger>

            <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
              {options.map((opt, i) => (
                <SelectItem
                  key={`${opt.submit_at}-${i}`}
                  value={opt.submit_at}
                  className="py-3 font-medium"
                >
                  {opt.submit_at}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {children}
    </div>
  );
}

type ModernStatCardProps = {
  item: StatCardItem;
};

function ModernStatCard({ item }: ModernStatCardProps) {
  const config = CARD_CONFIG[item.column_name ?? ""] || CARD_CONFIG.default;
  const Icon = config.icon;
  const percent = item.percentage ? Math.round(item.percentage) : 0;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-[26px] border border-slate-100 bg-white p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-15px_rgba(15,23,42,0.1)] sm:rounded-[32px] sm:p-6 lg:p-8">
      <div
        className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${config.gradient} blur-2xl transition-transform group-hover:scale-150`}
      />

      <div className="relative z-10">
        <div className="mb-6 flex items-start justify-between sm:mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 transition-colors duration-300 group-hover:bg-slate-900 group-hover:text-white sm:h-12 sm:w-12">
            <Icon size={22} />
          </div>

          <div className="flex flex-col items-end">
            <span className="mb-1 text-[10px] italic font-black uppercase tracking-tighter text-slate-400 sm:text-xs">
              Status
            </span>
            <span
              className={`h-2 w-8 rounded-full ${percent >= 100 ? "bg-emerald-500" : "bg-amber-400"}`}
            />
          </div>
        </div>

        <h3 className="min-h-[52px] text-sm font-bold leading-[1.4] text-slate-800 line-clamp-3 sm:min-h-[60px]">
          {item.column_name ?? "Noma'lum"}
        </h3>
      </div>

      <div className="relative z-10 mt-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-2xl font-black leading-none tracking-tighter text-slate-900 sm:text-3xl">
              {formatNumber(item.actual ?? 0)}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Amalda ({item.unit ?? "-"})
            </p>
          </div>

          <div className="shrink-0 text-right">
            <span className="text-base font-bold text-emerald-600 sm:text-lg">
              {percent}%
            </span>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-1000 ease-out group-hover:bg-emerald-500"
            style={{ width: `${item?.percentage}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 sm:text-[11px]">
          <span>Reja: {formatNumber(item.plan ?? 0)}</span>
          <ArrowUpRight
            size={14}
            className="text-emerald-500 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
      </div>
    </div>
  );
}
