import { useTranslation } from "react-i18next";
import { ArrowRight, Clock, FileText, UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatArea, formatDate, formatDateTime, formatMoney } from "@/features/billing/format";
import type { ContractHistoryItem, UUID } from "@/features/billing/types";
import { useGetContractHistoryQuery } from "@/services/billingApi";

interface ContractHistoryListProps {
  contractId: UUID;
}

type Primitive = string | number | boolean | null | undefined;

/** Backend `history.snapshot` kalitlari: bog'liq obyektlar `{id, name}` ko'rinishida. */
const relatedName = (v: unknown): string | null => {
  if (v && typeof v === "object" && "name" in (v as Record<string, unknown>)) {
    const name = (v as { name?: unknown }).name;
    return name === null || name === undefined ? null : String(name);
  }
  return null;
};

const MONEY_KEYS = /amount|debt|investment/i;
const DATE_KEYS = /date$/i;
const AREA_KEYS = /area$/i;

/** Qiymatni kalit nomiga qarab o'qiladigan ko'rinishga keltiradi. */
const useValueFormatter = () => {
  const { t } = useTranslation();
  return (key: string, value: unknown): string => {
    if (value === null || value === undefined || value === "") return "—";
    const related = relatedName(value);
    if (related !== null) return related;
    if (typeof value === "boolean") return t(value ? "billing.contracts_yes" : "billing.contracts_no");
    if (key === "status") {
      if (value === "active") return t("billing.status_active");
      if (value === "inactive") return t("billing.status_inactive");
      return String(value);
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    const v = value as Primitive;
    if (MONEY_KEYS.test(key)) return formatMoney(v as string | number, t("billing.currency"));
    if (AREA_KEYS.test(key)) return formatArea(v as string | number);
    if (DATE_KEYS.test(key)) return formatDate(String(v));
    return String(v);
  };
};

interface DiffRow {
  key: string;
  oldValue?: unknown;
  newValue: unknown;
  changed: boolean;
}

/** `data` → qatorlar: `{changes: {k: {old,new}}}`, `{new: snapshot}`, `{file: name}`. */
const extractRows = (data: Record<string, unknown> | null): { rows: DiffRow[]; file: string | null } => {
  if (!data) return { rows: [], file: null };
  const file = typeof data.file === "string" ? data.file : null;
  const rows: DiffRow[] = [];

  const changes = data.changes;
  if (changes && typeof changes === "object") {
    Object.entries(changes as Record<string, unknown>).forEach(([key, v]) => {
      if (v && typeof v === "object" && ("old" in (v as object) || "new" in (v as object))) {
        const { old: oldValue, new: newValue } = v as { old?: unknown; new?: unknown };
        rows.push({ key, oldValue, newValue, changed: true });
      } else {
        rows.push({ key, newValue: v, changed: true });
      }
    });
    return { rows, file };
  }

  const snapshot = data.new;
  if (snapshot && typeof snapshot === "object") {
    Object.entries(snapshot as Record<string, unknown>).forEach(([key, v]) => {
      if (v === null || v === undefined || v === "" || v === false) return;
      rows.push({ key, newValue: v, changed: false });
    });
    return { rows, file };
  }

  Object.entries(data).forEach(([key, v]) => {
    if (key === "file") return;
    rows.push({ key, newValue: v, changed: false });
  });
  return { rows, file };
};

const REASON_TONE: Record<string, string> = {
  created: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  imported: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  updated: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  yearly_updated: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  status_changed: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  renter_changed: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  file_added: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  file_deleted: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

function HistoryEntry({ item }: { item: ContractHistoryItem }) {
  const { t } = useTranslation();
  const fmt = useValueFormatter();
  const { rows, file } = extractRows(item.data);
  const reasonLabel = t(`billing.contracts_history_${item.reason}`, { defaultValue: item.reason });
  const fieldLabel = (key: string) => t(`billing.contracts_field_${key}`, { defaultValue: key });

  return (
    <li className="relative pl-6">
      <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-500/20" />
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${REASON_TONE[item.reason] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
            {reasonLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Clock size={12} /> {formatDateTime(item.created_at)}
          </span>
          {item.executor_name && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <UserRound size={12} /> {item.executor_name}
            </span>
          )}
        </div>

        {file && (
          <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <FileText size={14} className="text-blue-600 dark:text-blue-400" />
            <span className="text-slate-500 dark:text-slate-400">{t("billing.contracts_history_file")}:</span>
            <span className="font-medium truncate">{file}</span>
          </p>
        )}

        {rows.length > 0 && (
          <dl className="grid grid-cols-1 gap-1 text-sm">
            {rows.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-[minmax(110px,160px)_1fr] gap-2 items-start py-1 border-t border-slate-100 dark:border-slate-800 first:border-t-0"
              >
                <dt className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">{fieldLabel(row.key)}</dt>
                <dd className="min-w-0 flex flex-wrap items-center gap-1.5">
                  {row.changed ? (
                    <>
                      <span className="text-red-600 dark:text-red-400 line-through break-all">{fmt(row.key, row.oldValue)}</span>
                      <ArrowRight size={12} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 break-all">{fmt(row.key, row.newValue)}</span>
                    </>
                  ) : (
                    <span className="font-medium text-slate-800 dark:text-slate-100 break-all">{fmt(row.key, row.newValue)}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  );
}

/** Shartnoma tarixi (vaqt chizig'i). HistoryDialog va detail sahifada ishlatiladi. */
function ContractHistoryList({ contractId }: ContractHistoryListProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetContractHistoryQuery(contractId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm p-3">
        {t("billing.load_error")}
      </div>
    );
  }
  const items = data ?? [];
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8 gap-2 text-slate-500 dark:text-slate-400">
        <Clock size={28} className="opacity-60" />
        <p className="text-sm">{t("billing.contracts_history_empty")}</p>
      </div>
    );
  }

  return (
    <ul className="relative space-y-3 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
      {items.map((item) => (
        <HistoryEntry key={item.id} item={item} />
      ))}
    </ul>
  );
}

export default ContractHistoryList;
