import { useTranslation } from "react-i18next";
import type { ContractCounts, ContractStatusFilter } from "@/features/billing/types";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusCardsProps {
  counts: ContractCounts | undefined;
  loading: boolean;
  status: ContractStatusFilter;
  onChange: (status: ContractStatusFilter) => void;
}

const CARDS: Array<{ key: ContractStatusFilter; labelKey: string }> = [
  { key: "all", labelKey: "billing.status_all" },
  { key: "active", labelKey: "billing.status_active" },
  { key: "inactive", labelKey: "billing.status_inactive" },
];

/** Barchasi / Faol / Faol emas kartalari — bosilganda `status` filtri o'rnatiladi. */
function StatusCards({ counts, loading, status, onChange }: StatusCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {CARDS.map((card) => {
        const active = status === card.key;
        const total = counts?.[card.key] ?? 0;
        const addedToday = counts?.added_today?.[card.key] ?? 0;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onChange(card.key)}
            aria-pressed={active}
            className={`flex items-center justify-between gap-3 text-left rounded-xl border px-3 py-2 transition-all duration-200 cursor-pointer shadow-xs ${
              active
                ? "bg-gradient-to-br from-blue-600 to-blue-700 border-blue-600 text-white shadow-md"
                : "bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-100"
            }`}
          >
            <div className="flex items-baseline gap-2 min-w-0">
              <span className={`text-xs font-medium truncate ${active ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
                {t(card.labelKey)}
              </span>
              {loading && !counts ? (
                <Skeleton className="h-5 w-10" />
              ) : (
                <span className="text-lg font-bold tabular-nums leading-none">{total}</span>
              )}
            </div>
            <span className={`flex items-center gap-1 text-[11px] font-medium whitespace-nowrap ${active ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
              {t("billing.contracts_added_today")}
              <span className={`font-bold ${active ? "text-emerald-200" : "text-emerald-600 dark:text-emerald-400"}`}>
                +{addedToday}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default StatusCards;
