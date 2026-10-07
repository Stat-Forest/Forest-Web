// Shartnoma formasi uchun umumiy kichik input komponentlari (shadcn ustida).
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatThousands } from "./formState";

/** Dialog (z-[101]) va to'liq ekranli xarita ustida ham ochilishi uchun. */
export const POPOVER_Z = "z-[1200]";

export const inputClass =
  "h-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:!bg-slate-900 text-sm";
export const invalidClass = "!border-red-500 focus-visible:!ring-red-500/30";

interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs sm:text-[13px] font-semibold text-slate-600 dark:text-slate-300">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  type?: "text" | "date";
  inputMode?: "text" | "numeric" | "decimal" | "tel";
  maxLength?: number;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  /** Kiritishni faqat raqamlarga cheklash */
  digitsOnly?: boolean;
  /** Raqam va bitta nuqta (kasr) */
  decimal?: boolean;
}

const sanitizeDecimal = (raw: string): string => {
  let v = raw.replace(/,/g, ".").replace(/[^\d.-]/g, "");
  const negative = v.startsWith("-");
  v = v.replace(/-/g, "");
  const [int, ...rest] = v.split(".");
  v = rest.length ? `${int}.${rest.join("")}` : int;
  return negative ? `-${v}` : v;
};

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  type = "text",
  inputMode,
  maxLength,
  readOnly,
  disabled,
  className,
  digitsOnly,
  decimal,
}: TextInputProps) {
  return (
    <Input
      id={id}
      type={type}
      value={value}
      inputMode={inputMode ?? (digitsOnly ? "numeric" : decimal ? "decimal" : undefined)}
      maxLength={maxLength}
      readOnly={readOnly}
      disabled={disabled}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(digitsOnly ? raw.replace(/\D/g, "") : decimal ? sanitizeDecimal(raw) : raw);
      }}
      className={cn(inputClass, invalid && invalidClass, readOnly && "bg-slate-50 dark:!bg-slate-800/60", className)}
    />
  );
}

/** Pul inputi: ko'rinishda minglik ajratgich, holatda xom satr ("1234567.50"). */
export function MoneyInput({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  disabled,
  className,
}: Omit<TextInputProps, "type" | "digitsOnly" | "decimal">) {
  return (
    <Input
      id={id}
      value={formatThousands(value)}
      inputMode="decimal"
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      onChange={(e) => {
        let v = e.target.value.replace(/[\s\u00a0]/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
        const [int, ...rest] = v.split(".");
        v = rest.length ? `${int}.${rest.join("").slice(0, 2)}` : int;
        onChange(v);
      }}
      className={cn(inputClass, "tabular-nums", invalid && invalidClass, className)}
    />
  );
}

export interface Option {
  value: string;
  label: string;
}

const NONE = "__none__";

interface SelectFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** "Tanlanmagan" bandi (qiymatni tozalash) */
  allowEmpty?: boolean;
  className?: string;
}

export function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
  disabled,
  allowEmpty = true,
  className,
}: SelectFieldProps) {
  const { t } = useTranslation();
  return (
    <Select
      value={value || ""}
      onValueChange={(v) => onChange(v === NONE ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-10 w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:!bg-slate-900",
          invalid && invalidClass,
          className,
        )}
      >
        <SelectValue placeholder={placeholder ?? t("billing.form_select_placeholder")} />
      </SelectTrigger>
      <SelectContent className={cn(POPOVER_Z, "max-h-72")}>
        {allowEmpty && (
          <SelectItem value={NONE} className="text-slate-500">
            {t("billing.form_none")}
          </SelectItem>
        )}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SectionCard({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 sm:p-5",
        className,
      )}
    >
      {title && <h3 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>}
      {children}
    </section>
  );
}

export function SectionErrors({ messages }: { messages?: string[] }) {
  const { t } = useTranslation();
  if (!messages?.length) return null;
  return (
    <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
      <p className="mb-1 font-semibold">{t("billing.form_section_errors")}</p>
      <ul className="list-disc space-y-0.5 pl-5">
        {messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
