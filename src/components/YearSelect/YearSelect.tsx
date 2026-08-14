import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface YearSelectProps {
  value?: number | string | null;
  onChange: (year: number) => void;
  /** Joriy yildan nechta yil oldin ko'rsatilsin */
  yearsBefore?: number;
  /** Joriy yildan nechta yil keyin ko'rsatilsin */
  yearsAfter?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Yilni qo'lda yozish o'rniga ro'yxatdan tanlash uchun select.
 * Joriy yil alohida belgilanadi va ro'yxat ochilganda o'sha yil ko'rinadi.
 */
export const YearSelect: React.FC<YearSelectProps> = ({
  value,
  onChange,
  yearsBefore = 2,
  yearsAfter = 5,
  placeholder,
  disabled,
  className,
}) => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = currentYear - yearsBefore; year <= currentYear + yearsAfter; year++) {
      list.push(year);
    }

    // Tanlangan yil oraliqdan tashqarida bo'lsa (eski reja) — uni ham qo'shamiz
    const selected = Number(value);
    if (selected && !list.includes(selected)) {
      list.push(selected);
      list.sort((a, b) => a - b);
    }

    return list;
  }, [currentYear, yearsBefore, yearsAfter, value]);

  const selectedValue = value ? String(value) : "";

  return (
    <Select
      value={selectedValue}
      onValueChange={(next) => onChange(Number(next))}
      disabled={disabled}
    >
      <SelectTrigger
        className={
          className ||
          "w-full min-h-[45px] rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
        }
      >
        <span className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <SelectValue placeholder={placeholder || t("selectYear")} />
        </span>
      </SelectTrigger>

      <SelectContent className="rounded-xl max-h-[280px]">
        {years.map((year) => (
          <SelectItem key={year} value={String(year)} className="py-2.5">
            <span className="flex items-center gap-2">
              <span className="font-semibold tabular-nums">{year}</span>
              {year === currentYear && (
                <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 text-[11px] font-semibold">
                  {t("currentYear")}
                </span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default YearSelect;
