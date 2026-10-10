import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReportStatusKey } from "@/types/dashboardOverview";

/**
 * Holat ranglari (dataviz validator: yorug' va to'q fonda CVD/kontrast tekshirilgan).
 * Ilovadagi holat semantikasiga mos: qabul — emerald, yuborilgan — amber,
 * saqlangan — blue, qaytarilgan — red. To'q rejim uchun alohida qadamlar.
 */
const STATUS_COLORS: Record<"light" | "dark", Record<ReportStatusKey, string>> = {
  light: { accepted: "#10b981", sent: "#f59e0b", saved: "#3b82f6", cancelled: "#ef4444" },
  dark: { accepted: "#059669", sent: "#d97706", saved: "#3b82f6", cancelled: "#ef4444" },
};

/** Stack tartibi (pastdan yuqoriga) va legend tartibi. */
export const STATUS_ORDER: ReportStatusKey[] = ["accepted", "sent", "saved", "cancelled"];

export const DISCIPLINE_KEYS = ["on_time", "late", "in_review", "missing"] as const;
export type DisciplineKey = (typeof DISCIPLINE_KEYS)[number];

export function disciplineColors(status: Record<ReportStatusKey, string>): Record<DisciplineKey, string> {
  return { on_time: status.accepted, late: status.sent, in_review: status.saved, missing: status.cancelled };
}

export interface ChartTheme {
  isDark: boolean;
  status: Record<ReportStatusKey, string>;
  surface: string;
  grid: string;
  axis: string;
  cursor: string;
}

/** `<html class="dark">` kuzatuvchisi (Header'dagi tema almashtirgich shu klassni o'zgartiradi). */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export function useChartTheme(): ChartTheme {
  const isDark = useIsDark();
  return useMemo(
    () => ({
      isDark,
      status: STATUS_COLORS[isDark ? "dark" : "light"],
      surface: isDark ? "#0f172a" : "#ffffff",
      grid: isDark ? "#1e293b" : "#e2e8f0",
      axis: isDark ? "#94a3b8" : "#64748b",
      cursor: isDark ? "rgba(148,163,184,0.08)" : "rgba(100,116,139,0.08)",
    }),
    [isDark],
  );
}

const UZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];
const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

/**
 * Joriy til bo'yicha son/sana formatlovchilari. O'zbek oy nomlari qo'lda — brauzerlarning
 * `uz` Intl ma'lumoti to'liq emas ("M10" kabi chiqaradi).
 */
export function useFormatters() {
  const { i18n } = useTranslation();
  const isRu = i18n.language === "ru";
  const locale = isRu ? "ru-RU" : "uz-Latn-UZ";
  return useMemo(() => {
    const number = new Intl.NumberFormat(locale);
    const ruMonthShort = new Intl.DateTimeFormat("ru-RU", { month: "short" });
    const ruMonthLong = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
    const ruDay = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
    const ruDayYear = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" });
    const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
    const toDate = (ym: string) => {
      const [y, m] = ym.split("-").map(Number);
      return new Date(y, (m || 1) - 1, 1);
    };
    const toDay = (iso: string) => {
      const [y, m, d] = iso.split("-").map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    };
    const short = (date: Date) =>
      isRu ? ruMonthShort.format(date).replace(/\.$/, "") : UZ_MONTHS_SHORT[date.getMonth()];
    return {
      locale,
      num: (v: number) => number.format(v ?? 0),
      pct: (v: number) => `${(v ?? 0).toLocaleString(locale, { maximumFractionDigits: 1 })}%`,
      /** "2026-01" -> "yan 26" (yanvarda yil qo'shiladi), boshqalari faqat oy. */
      monthTick: (ym: string) => {
        const date = toDate(ym);
        const label = short(date);
        return date.getMonth() === 0 ? `${label} ${String(date.getFullYear()).slice(2)}` : label;
      },
      monthLong: (ym: string) => {
        const date = toDate(ym);
        return isRu ? ruMonthLong.format(date) : `${date.getFullYear()}-yil ${UZ_MONTHS[date.getMonth()]}`;
      },
      day: (iso: string) => {
        const date = toDay(iso);
        return isRu ? ruDay.format(date) : `${date.getDate()} ${UZ_MONTHS_SHORT[date.getMonth()]}`;
      },
      dayYear: (iso: string) => {
        const date = toDay(iso);
        return isRu
          ? ruDayYear.format(date)
          : `${date.getDate()} ${UZ_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
      },
      time: (iso: string) => time.format(new Date(iso)),
    };
  }, [isRu, locale]);
}

export type Formatters = ReturnType<typeof useFormatters>;
