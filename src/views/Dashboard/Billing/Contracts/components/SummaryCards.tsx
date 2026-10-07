import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, CircleDollarSign, MapPinned, Wallet } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { YEARS } from "@/features/billing/constants";
import { formatArea, formatMoney, toNumber } from "@/features/billing/format";
import type { ContractSummary } from "@/features/billing/types";
import type { YearParam } from "./contractsFilters";

interface SummaryCardsProps {
  summary: ContractSummary | undefined;
  loading: boolean;
  year: YearParam;
  onYearChange: (year: YearParam) => void;
}

interface CardSpec {
  key: string;
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone: string;
  valueClass?: string;
}

/** "Yil bo'yicha" select + 4 summa kartasi (maydon, hisoblangan, to'langan, qarzdorlik). */
function SummaryCards({ summary, loading, year, onYearChange }: SummaryCardsProps) {
  const { t } = useTranslation();
  const suffix = year === "all" ? "" : ` (${year})`;
  const debt = toNumber(summary?.total_debt);

  const cards: CardSpec[] = [
    {
      key: "area",
      label: t("billing.contracts_sum_area"),
      value: formatArea(summary?.total_rent_area),
      icon: <MapPinned size={22} />,
      tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    },
    {
      key: "calculated",
      label: `${t("billing.contracts_sum_calculated")}${suffix}`,
      value: formatMoney(summary?.total_rent_amount, t("billing.currency")),
      icon: <Calculator size={22} />,
      tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
    },
    {
      key: "paid",
      label: `${t("billing.contracts_sum_paid")}${suffix}`,
      value: formatMoney(summary?.total_paid_amount, t("billing.currency")),
      icon: <Wallet size={22} />,
      tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
    {
      key: "debt",
      label: `${t("billing.contracts_sum_debt")}${suffix}`,
      value:
        debt > 0
          ? `- ${formatMoney(debt, t("billing.currency"))}`
          : debt < 0
            ? `+ ${formatMoney(Math.abs(debt), t("billing.currency"))}`
            : formatMoney(0, t("billing.currency")),
      icon: <CircleDollarSign size={22} />,
      tone:
        debt > 0
          ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300"
          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
      valueClass:
        debt > 0
          ? "text-red-600 dark:text-red-400"
          : debt < 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 py-1.5 pl-4 pr-1.5 shadow-xs backdrop-blur-md">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {t("billing.contracts_by_year")}
        </span>
        <Select
          value={String(year)}
          onValueChange={(v) => onYearChange(v === "all" ? "all" : Number(v))}
        >
          <SelectTrigger className="h-9 w-[160px] rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("billing.contracts_all_years")}</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.key}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 shadow-xs backdrop-blur-md transition-colors"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.tone}`}>
              {card.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                {card.label}
              </p>
              {loading && !summary ? (
                <Skeleton className="h-6 w-28 mt-1" />
              ) : (
                <p className={`text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums truncate ${card.valueClass ?? ""}`}>
                  {card.value}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SummaryCards;
