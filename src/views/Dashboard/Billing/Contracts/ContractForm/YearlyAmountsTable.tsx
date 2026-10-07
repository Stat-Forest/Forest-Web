// Yillik summalar (2020–2026) jadvali + 4 ta avtomatik karta (billing
// ContractYearlyAmountTable + CreateContractForm yillik bloki porti).
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertOctagon, Calculator, CircleDollarSign, Loader2, Save, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/billing/format";
import { MoneyInput } from "./fields";
import { yearlyTotals, type YearlyRow } from "./formState";

type YearlyField = keyof Omit<YearlyRow, "year">;

interface YearlyAmountsTableProps {
  rows: YearlyRow[];
  onChange: (index: number, field: YearlyField, value: string) => void;
  errorOf?: (key: string) => string | undefined;
  readOnly?: boolean;
  /** Tahrirlash rejimida — alohida "Yillik summalarni saqlash" (PATCH yearly-amounts) */
  onSave?: () => void;
  saving?: boolean;
}

const FIELDS: Array<{ field: YearlyField; labelKey: string }> = [
  { field: "contract_amount", labelKey: "billing.form_yearly_contract" },
  { field: "calculated_amount", labelKey: "billing.form_yearly_calculated" },
  { field: "paid_amount", labelKey: "billing.form_yearly_paid" },
  { field: "penalty_amount", labelKey: "billing.form_yearly_penalty" },
];

function YearlyAmountsTable({ rows, onChange, errorOf, readOnly, onSave, saving }: YearlyAmountsTableProps) {
  const { t } = useTranslation();
  const totals = useMemo(() => yearlyTotals(rows), [rows]);
  const currency = t("billing.currency");
  const isCredit = totals.debt <= 0;

  const cards = [
    {
      label: t("billing.form_yearly_total_calculated"),
      value: totals.calculated,
      icon: Calculator,
      tone: "text-violet-600 bg-violet-500/10 dark:text-violet-300",
      valueTone: "",
    },
    {
      label: t("billing.form_yearly_total_paid"),
      value: totals.paid,
      icon: Wallet,
      tone: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300",
      valueTone: "",
    },
    {
      label: t("billing.form_yearly_total_penalty"),
      value: totals.penalty,
      icon: AlertOctagon,
      tone: "text-amber-600 bg-amber-500/10 dark:text-amber-300",
      valueTone: "",
    },
    {
      label: isCredit ? t("billing.form_yearly_total_credit") : t("billing.form_yearly_total_debt"),
      value: Math.abs(totals.debt),
      icon: CircleDollarSign,
      tone: isCredit
        ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300"
        : "text-red-600 bg-red-500/10 dark:text-red-300",
      valueTone: isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone, valueTone }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-xs"
          >
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone)}>
              <Icon size={20} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
              <p className={cn("truncate text-base font-bold tabular-nums text-slate-900 dark:text-slate-100", valueTone)}>
                {formatMoney(value, currency)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">
              <th className="px-3 py-2.5 w-20">{t("billing.form_yearly_year")}</th>
              {FIELDS.map((f) => (
                <th key={f.field} className="px-3 py-2.5">
                  {t(f.labelKey)}
                </th>
              ))}
              <th className="px-3 py-2.5">{t("billing.form_yearly_debt")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const debt = (Number(row.calculated_amount) || 0) - (Number(row.paid_amount) || 0);
              return (
                <tr
                  key={row.year}
                  className="border-t border-slate-100 dark:border-slate-800 even:bg-slate-50/50 dark:even:bg-slate-800/20"
                >
                  <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100">{row.year}</td>
                  {FIELDS.map(({ field }) => {
                    const error = errorOf?.(`yearly.${index}.${field}`);
                    return (
                      <td key={field} className="px-2 py-1.5 align-top">
                        {readOnly ? (
                          <span className="tabular-nums">{formatMoney(row[field], "")}</span>
                        ) : (
                          <>
                            <MoneyInput
                              value={row[field]}
                              onChange={(v) => onChange(index, field, v)}
                              invalid={!!error}
                              className="h-9 min-w-[110px]"
                              placeholder="0"
                            />
                            {error && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{error}</p>}
                          </>
                        )}
                      </td>
                    );
                  })}
                  <td
                    className={cn(
                      "px-3 py-2 italic tabular-nums",
                      debt > 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    {formatMoney(debt, "")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {onSave && !readOnly && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? t("billing.form_saving") : t("billing.form_yearly_save")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default YearlyAmountsTable;
