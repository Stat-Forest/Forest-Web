"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthHeader from "@/components/Header/AuthHeader";
import { useGetLoginStatsQuery } from "@/services/statistikApi";
import { useGetLoginStatDeadlineQuery } from "@/services/reportsApi";
import PieChartLanding from "@/components/Charts/PieChart";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import {
  Leaf,
  Trees,
  TreeDeciduous,
  TreePine,
  Sprout,
  FlaskConical,
  ShieldCheck,
  Globe2,
  Tractor,
  Pill,
  ArrowUpRight,
  ArrowUp,
  Target,
  Calendar,
  Layers,
  Filter,
  MapPin,
  Phone,
  Mail,
  BarChart3,
  TrendingUp,
  Globe,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import heroBg from "@/assets/img/image.png";
import logo from "@/assets/logo.png";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatNumber = (val: number) =>
  new Intl.NumberFormat("uz-UZ").format(val || 0);

const getCardConfig = (name?: string) => {
  if (!name) return { icon: Target, color: "#00BC7D", gradient: "from-emerald-500/20 to-emerald-500/5" };
  const lower = name.toLowerCase();
  if (lower.includes("qoplangan") || lower.includes("maydonlari"))
    return { icon: Trees, color: "#00BC7D", gradient: "from-emerald-500/20 to-emerald-500/5" };
  if (lower.includes("o'zlashtirib") || lower.includes("foydalanishga"))
    return { icon: Tractor, color: "#10b981", gradient: "from-teal-500/20 to-teal-500/5" };
  if (lower.includes("plantatsiya") || (lower.includes("barpo") && lower.includes("dorivor")))
    return { icon: Sprout, color: "#84cc16", gradient: "from-lime-500/20 to-lime-500/5" };
  if (lower.includes("xomashyo") || lower.includes("tayyorlash"))
    return { icon: FlaskConical, color: "#f59e0b", gradient: "from-amber-500/20 to-amber-500/5" };
  if (lower.includes("himoya") || lower.includes("ihota") || lower.includes("cho'l, tog'li"))
    return { icon: ShieldCheck, color: "#06b6d4", gradient: "from-cyan-500/20 to-cyan-500/5" };
  if (lower.includes("niholxona") || lower.includes("ko'chatchona"))
    return { icon: TreeDeciduous, color: "#10b981", gradient: "from-emerald-500/20 to-emerald-500/5" };
  if (lower.includes("orolbo'yi") || lower.includes("yashil qoplama"))
    return { icon: Globe2, color: "#0284c7", gradient: "from-sky-500/20 to-sky-500/5" };
  if (lower.includes("tut") || lower.includes("yetishtirish"))
    return { icon: TreePine, color: "#059669", gradient: "from-green-500/20 to-green-500/5" };
  if (lower.includes("dorivor"))
    return { icon: Pill, color: "#eab308", gradient: "from-yellow-500/20 to-yellow-500/5" };
  return { icon: Leaf, color: "#00BC7D", gradient: "from-emerald-500/20 to-emerald-500/5" };
};

// ─── Counter hook ─────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
      else setCount(target);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

// ─── Scroll reveal hook ───────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:rounded-2xl sm:p-6 lg:p-8 animate-pulse">
      <div className="mb-6 flex items-start justify-between">
        <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-6 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="mb-3 h-4 w-3/4 rounded-lg bg-slate-100 dark:bg-slate-800" />
      <div className="mb-6 h-3 w-1/2 rounded-lg bg-slate-100 dark:bg-slate-800" />
      <div className="mt-auto space-y-3">
        <div className="flex justify-between">
          <div className="h-8 w-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-6 w-14 rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="h-3 w-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}

// ─── Scroll-to-top floating button ────────────────────────────────────────────
function ScrollToTopButton() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("landing_scroll_top")}
      className="fixed bottom-8 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#00BC7D] text-white shadow-lg shadow-[#00BC7D]/30 transition-all duration-300 hover:bg-[#00a36c] hover:scale-110 hover:shadow-xl active:scale-95"
    >
      <ArrowUp size={22} />
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ModernLanding() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const lang = useSelector((state: RootState) => state.language.lang);
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");

  const heroStats = [
    { icon: BarChart3, label: t("landing_stat_yearly"), value: "12+" },
    { icon: TrendingUp, label: t("landing_stat_percent"), value: "114%" },
    { icon: Globe, label: t("landing_stat_regions"), value: "14" },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleQuickLinkClick = (key: string) => {
    if (key === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (key === "strategic") {
      scrollToSection("strategik-korsatkichlar");
    } else if (key === "operational") {
      scrollToSection("operatsion-tahlil");
    } else if (key === "login") {
      navigate("/auth");
    }
  };

  const { data: monthData, isLoading: monthLoading } = useGetLoginStatsQuery({
    lang, monthly, statement_status: "month", yearly: "",
  });
  const { data: yearData, isLoading: yearLoading } = useGetLoginStatsQuery({
    lang, monthly: "", statement_status: "year", yearly,
  });
  const { data: deadlineMonthData } = useGetLoginStatDeadlineQuery({ period_type: "monthly" });
  const { data: deadlineYearData } = useGetLoginStatDeadlineQuery({ period_type: "yearly" });

  const month: StatCardItem[] = Array.isArray(monthData) ? (monthData as StatCardItem[]) : [];
  const year: StatCardItem[] = Array.isArray(yearData) ? (yearData as StatCardItem[]) : [];
  const deadlineMonth = deadlineMonthData as DeadlineResponse | undefined;
  const deadlineYear = deadlineYearData as DeadlineResponse | undefined;

  // Hero reveal
  const { ref: heroRef, inView: heroInView } = useInView(0.1);

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#0B132B] text-slate-900 dark:text-slate-100 selection:bg-emerald-100 selection:text-emerald-900 transition-colors duration-300">
      <AuthHeader />

      <main className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-12">

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <div ref={heroRef} className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-12 xl:gap-6">

          {/* Hero left */}
          <div
            className={`relative col-span-1 overflow-hidden rounded-2xl border border-emerald-900/20 bg-slate-900 p-6 shadow-md sm:p-8 lg:col-span-7 lg:rounded-3xl lg:p-10 flex flex-col justify-between transition-all duration-700 ${
              heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 scale-105"
              style={{ backgroundImage: `url(${heroBg})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/65 to-slate-900/30 z-0" />

            <div className="relative z-10">
              <div className="mb-5 inline-flex items-center gap-2.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 px-3.5 py-1 backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 sm:text-xs">
                  {t("landing_hero_tag")}
                </span>
              </div>

              <h1 className="text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl drop-shadow-md">
                {t("landing_hero_title1")} <br />
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent">
                  {t("landing_hero_title2")}
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-base font-medium leading-relaxed text-slate-200 sm:text-lg drop-shadow-xs">
                {t("landing_hero_desc")}
              </p>
            </div>

            {/* Hero bottom stats */}
            <div className="relative z-10 mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
              {heroStats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} className="text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {label}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pie chart right */}
          <div
            className={`relative col-span-1 flex min-h-[320px] flex-col justify-between rounded-2xl border border-white dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm sm:min-h-[360px] sm:p-6 lg:col-span-5 lg:rounded-3xl lg:p-8 transition-all duration-700 delay-150 ${
              heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="h-full w-full">
              <PieChartLanding />
            </div>
          </div>
        </div>

        {/* ── SECTIONS ───────────────────────────────────────────────────── */}
        <div className="space-y-12 sm:space-y-14 lg:space-y-16">
          <SectionLayout
            id="strategik-korsatkichlar"
            title={t("landing_strategic_title")}
            subtitle={t("landing_strategic_subtitle")}
            icon={<Layers className="text-[#00BC7D]" />}
            value={yearly}
            onChange={setYearly}
            options={deadlineYear?.results ?? []}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-8">
              {yearLoading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : year.map((item, idx) => (
                    <ModernStatCard key={`${item.column_name ?? "year"}-${idx}`} item={item} delay={idx * 80} />
                  ))}
            </div>
          </SectionLayout>

          <SectionLayout
            id="operatsion-tahlil"
            title={t("landing_operational_title")}
            subtitle={t("landing_operational_subtitle")}
            icon={<Calendar className="text-[#00BC7D]" />}
            value={monthly}
            onChange={setMonthly}
            options={deadlineMonth?.results ?? []}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-8">
              {monthLoading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : month.map((item, idx) => (
                    <ModernStatCard key={`${item.column_name ?? "month"}-${idx}`} item={item} delay={idx * 80} />
                  ))}
            </div>
          </SectionLayout>
        </div>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t-2 border-[#00BC7D] bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12 lg:py-16">

            {/* Brand */}
            <div className="lg:col-span-5">
              <div className="mb-5 flex items-center gap-3">
                <img src={logo} alt="STAT-URMON logo" width={44} height={44} className="rounded-xl" />
                <span className="text-xl font-black tracking-tight text-white">STAT-URMON</span>
              </div>
              <p className="mb-6 max-w-sm text-sm leading-relaxed text-slate-400">
                {t("landing_footer_desc")}
              </p>
              <div className="flex items-center gap-2 rounded-full border border-[#00BC7D]/30 bg-[#00BC7D]/10 px-3 py-1.5 w-fit">
                <span className="h-2 w-2 rounded-full bg-[#00BC7D] animate-pulse" />
                <span className="text-xs font-bold text-[#00BC7D]">{t("landing_system_active")}</span>
              </div>
            </div>

            {/* Quick links */}
            <div className="lg:col-span-3">
              <h4 className="mb-5 text-sm font-black uppercase tracking-widest text-white">{t("landing_quick_links")}</h4>
              <ul className="space-y-3">
                {[
                  { key: "home", label: t("landing_nav_home") },
                  { key: "strategic", label: t("landing_nav_strategic") },
                  { key: "operational", label: t("landing_nav_operational") },
                  { key: "login", label: t("landing_nav_login") },
                ].map(({ key, label }) => (
                  <li key={key}>
                    <span
                      onClick={() => handleQuickLinkClick(key)}
                      className="group flex items-center gap-2 text-sm text-slate-400 cursor-pointer transition-colors hover:text-[#00BC7D]"
                    >
                      <span className="h-px w-4 bg-slate-600 transition-all group-hover:w-6 group-hover:bg-[#00BC7D]" />
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="lg:col-span-4">
              <h4 className="mb-5 text-sm font-black uppercase tracking-widest text-white">{t("landing_contact")}</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00BC7D]/15">
                    <MapPin size={14} className="text-[#00BC7D]" />
                  </div>
                  <span className="text-sm text-slate-400">
                    {t("landing_committee")}
                  </span>
                </li>

                <li className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00BC7D]/15">
                    <Phone size={14} className="text-[#00BC7D]" />
                  </div>
                  <a
                    href="tel:+998712078877"
                    className="text-sm text-slate-400 hover:text-[#00BC7D] transition-colors"
                  >
                    +998 71 207 88 77
                  </a>
                </li>

                <li className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00BC7D]/15">
                    <Mail size={14} className="text-[#00BC7D]" />
                  </div>
                  <a
                    href="mailto:urmoninfo@gmail.com"
                    className="text-sm text-slate-400 hover:text-[#00BC7D] transition-colors"
                  >
                    urmoninfo@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 py-6 sm:flex-row">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} STAT-URMON. {t("landing_rights")}
            </p>
            <div className="flex items-center gap-2">
              <Trees size={14} className="text-[#00BC7D]" />
              <span className="text-xs text-slate-500">{t("landing_agency")}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── SCROLL TO TOP ──────────────────────────────────────────────── */}
      <ScrollToTopButton />
    </div>
  );
}

// ─── SectionLayout ────────────────────────────────────────────────────────────
type SectionLayoutProps = {
  id?: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: DeadlineOption[];
  children: ReactNode;
};

function SectionLayout({ id, title, subtitle, icon, value, onChange, options, children }: SectionLayoutProps) {
  const { t } = useTranslation();
  const { ref, inView } = useInView(0.1);
  return (
    <div
      id={id}
      ref={ref}
      className={`space-y-6 sm:space-y-8 transition-all duration-700 ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end md:gap-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm sm:h-14 sm:w-14 sm:rounded-2xl">
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-black leading-none tracking-tight text-slate-800 dark:text-white sm:text-2xl">
              {title}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-base">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="group relative w-full md:w-auto">
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-[#00BC7D]/20 to-[#00BC7D]/5 opacity-0 blur-lg transition group-hover:opacity-100" />
          <Select onValueChange={onChange} value={value}>
            <SelectTrigger className="relative h-12 w-full rounded-xl border-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 font-bold shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 focus:ring-2 focus:ring-[#00BC7D] sm:h-14 sm:px-6 md:w-[280px]">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-400" />
                <SelectValue placeholder={t("landing_select_period")} />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xl">
              {options.map((opt, i) => (
                <SelectItem key={`${opt.submit_at}-${i}`} value={opt.submit_at} className="py-3 font-medium">
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

// ─── ModernStatCard ───────────────────────────────────────────────────────────
type ModernStatCardProps = {
  item: StatCardItem;
  delay?: number;
};

function ModernStatCard({ item, delay = 0 }: ModernStatCardProps) {
  const { t } = useTranslation();
  const config = getCardConfig(item.column_name);
  const Icon = config.icon;
  const percent = item.percentage ? Math.round(item.percentage) : 0;
  const actual = item.actual ?? 0;

  const { ref, inView } = useInView(0.1);
  const countedActual = useCountUp(actual, 1200, inView);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setBarWidth(Math.min(percent, 100)), 200);
      return () => clearTimeout(t);
    }
  }, [inView, percent]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl dark:hover:border-slate-700 sm:rounded-2xl sm:p-6 lg:p-8 ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {/* Glow blob */}
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${config.gradient} blur-2xl transition-transform group-hover:scale-150`} />

      <div className="relative z-10">
        <div className="mb-6 flex items-start justify-between sm:mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors duration-300 group-hover:bg-[#00BC7D] group-hover:text-white sm:h-12 sm:w-12">
            <Icon size={22} />
          </div>
          <div className="flex flex-col items-end">
            {percent >= 100 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 sm:text-xs">
                <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="6" fill="#00BC7D"/>
                  <path d="M3.5 6.2l1.8 1.8 3.2-3.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t("landing_completed")} · {percent}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 sm:text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                {t("landing_in_progress")} · {percent}%
              </span>
            )}
          </div>
        </div>

        <h3 className="min-h-[52px] text-sm font-bold leading-[1.4] text-slate-800 dark:text-slate-100 line-clamp-3 sm:min-h-[60px]">
          {item.column_name ?? t("landing_unknown")}
        </h3>
      </div>

      <div className="relative z-10 mt-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-2xl font-black leading-none tracking-tighter text-slate-900 dark:text-white sm:text-3xl">
              {formatNumber(countedActual)}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {t("landing_actual")} ({item.unit ?? "–"})
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-base font-bold text-[#00BC7D] sm:text-lg">{percent}%</span>
          </div>
        </div>

        {/* Animated progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-[#00BC7D] transition-[width] duration-1000 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 sm:text-[11px]">
          <span>{t("landing_plan")}: {formatNumber(item.plan ?? 0)}</span>
          <ArrowUpRight
            size={14}
            className="text-[#00BC7D] opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
      </div>
    </div>
  );
}
