import { formatMoney, toNumber } from "@/features/billing/format";

export const GREEN_MONEY_CLASS = "font-semibold text-emerald-600 dark:text-emerald-400";

/** Qarzdorlik rangi: musbat qarz → qizil, ortiqcha to'lov → yashil, 0 → neytral. */
export const debtClass = (value: string | number | null | undefined) => {
  const debt = toNumber(value);
  if (debt > 0) return "font-semibold text-red-600 dark:text-red-400";
  if (debt < 0) return GREEN_MONEY_CLASS;
  return "font-semibold text-slate-700 dark:text-slate-200";
};

/** "- 1 000 so'm" / "+ 1 000 so'm" / "0 so'm". */
export const debtText = (value: string | number | null | undefined, currency: string) => {
  const debt = toNumber(value);
  if (debt > 0) return `- ${formatMoney(debt, currency)}`;
  if (debt < 0) return `+ ${formatMoney(Math.abs(debt), currency)}`;
  return formatMoney(0, currency);
};
