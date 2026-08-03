import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

interface FiltersSectionProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedRegion: string;
  setSelectedRegion: (value: string) => void;
  selectedPeriod: string;
  setSelectedPeriod: (value: string) => void;
  selectedYear: string;
  setSelectedYear: (value: string) => void;
  selectedQuarter?: string;
  setSelectedQuarter?: (value: string) => void;
  deadline: any;
  deadlinePage: number;
  setDeadlinePage: (fn: (p: number) => number) => void;
  perPage: number;
  onSearch: () => void;
  isLoading: boolean;
  exportComponent?: React.ReactNode;
}

export default function FiltersSection({
  selectedPeriod,
  setSelectedPeriod,
  selectedQuarter,
  setSelectedQuarter,
  deadline,
  deadlinePage,
  setDeadlinePage,
  perPage,
  onSearch,
  isLoading,
  exportComponent,
}: FiltersSectionProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-3 w-full md:w-auto">
        <Skeleton className="h-10 w-full md:w-[250px] rounded-md" />
        <Skeleton className="h-10 w-full md:w-[220px] rounded-md" />
        <Skeleton className="h-10 w-full md:w-[220px] rounded-md" />
        <Skeleton className="h-10 w-full md:w-[150px] rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap gap-2 w-full md:w-auto items-center"
      data-aos="fade-left"
      data-aos-delay="100"
    >
      <span className="font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-h-[40px] py-2 px-3.5 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 shadow-xs transition-colors">
        {t("select_period_hint")} <ArrowRight size={16} />
      </span>

      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <SelectTrigger
          className="w-full md:w-[200px] text-xs sm:text-sm h-[40px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-none focus:ring-1 focus:ring-blue-500 rounded-xl"
          data-aos="fade-up"
          data-aos-delay="160"
        >
          <SelectValue placeholder={`${t("report_type") || t("reportType")}`} />
        </SelectTrigger>
        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
          {deadline?.results?.length > 0 ? (
            <>
              <SelectItem value=" " className="dark:text-slate-100">{`${t("all")}`}</SelectItem>
              {deadline.results.map((item: any) => (
                <SelectItem key={item.id} value={item.id} className="dark:text-slate-100">
                  {item.submit_at}
                </SelectItem>
              ))}

              <div className="flex items-center justify-between px-2 py-1 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deadlinePage === 1}
                  onClick={() => setDeadlinePage((p) => Math.max(p - 1, 1))}
                  className="h-7 text-xs rounded-lg"
                >
                  {t("before")}
                </Button>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {deadlinePage} / {Math.ceil(deadline.count / perPage)}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    deadlinePage === Math.ceil(deadline.count / perPage)
                  }
                  onClick={() =>
                    setDeadlinePage((p) =>
                      Math.min(p + 1, Math.ceil(deadline.count / perPage)),
                    )
                  }
                  className="h-7 text-xs rounded-lg"
                >
                  {t("next")}
                </Button>
              </div>
            </>
          ) : (
            <div className="p-2 text-center text-muted-foreground text-xs">
              {t("noDeadlines")}
            </div>
          )}
        </SelectContent>
      </Select>

      <Select
        value={selectedQuarter || "all"}
        onValueChange={(val) => setSelectedQuarter?.(val === "all" ? "" : val)}
      >
        <SelectTrigger
          className="w-full md:w-[150px] text-xs sm:text-sm h-[40px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-none focus:ring-1 focus:ring-blue-500 rounded-xl"
          data-aos="fade-up"
          data-aos-delay="180"
        >
          <SelectValue placeholder={t("quarter")} />
        </SelectTrigger>
        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
          <SelectItem value="all" className="dark:text-slate-100">{t("all")}</SelectItem>
          <SelectItem value="q1" className="dark:text-slate-100">{t("quarter_1")}</SelectItem>
          <SelectItem value="q2" className="dark:text-slate-100">{t("quarter_2")}</SelectItem>
          <SelectItem value="q3" className="dark:text-slate-100">{t("quarter_3")}</SelectItem>
          <SelectItem value="q4" className="dark:text-slate-100">{t("quarter_4")}</SelectItem>
        </SelectContent>
      </Select>

      <Button
        onClick={onSearch}
        data-aos="zoom-in"
        data-aos-delay="200"
        className="h-[40px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95 whitespace-nowrap"
      >
        {t("item_79")}
      </Button>

      {exportComponent}
    </div>
  );
}
