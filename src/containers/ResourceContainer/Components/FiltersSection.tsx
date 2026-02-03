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
  deadline: any;
  deadlinePage: number;
  setDeadlinePage: (fn: (p: number) => number) => void;
  perPage: number;
  onSearch: () => void;
  isLoading: boolean;
}

export default function FiltersSection({
  selectedPeriod,
  setSelectedPeriod,
  deadline,
  deadlinePage,
  setDeadlinePage,
  perPage,
  onSearch,
  isLoading,
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
      <span className="font-[500] bg-white min-h-[40px] py-2 px-3 rounded-xl text-md flex items-center gap-3">Davrni tanlang va umumiy hisobotlarni oling <ArrowRight /></span>

      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <SelectTrigger
          className="w-full md:w-[220px] text-xl min-h-[40px] bg-ice border-white/30 focus:border-[#3B82F6] transition-colors duration-300"
          data-aos="fade-up"
          data-aos-delay="160"
        >
          <SelectValue placeholder={`${t("reportType")}`} />
        </SelectTrigger>
        <SelectContent>
          {deadline?.results?.length > 0 ? (
            <>
              <SelectItem value=" ">{`${t("allReports")}`}</SelectItem>
              {deadline.results.map((item: any) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.submit_at}
                </SelectItem>
              ))}

              <div className="flex items-center justify-between px-2 py-1 border-t">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deadlinePage === 1}
                  onClick={() => setDeadlinePage((p) => Math.max(p - 1, 1))}
                >
                  {t("before")}
                </Button>
                <span className="text-xs text-gray-500">
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
                >
                  {t("next")}
                </Button>
              </div>
            </>
          ) : (
            <div className="p-2 text-center text-muted-foreground text-sm">
              {t("noDeadlines")}
            </div>
          )}
        </SelectContent>
      </Select>
      <Button
        onClick={onSearch}
        data-aos="zoom-in"
        data-aos-delay="200"
        className="hover:bg-[#2563EB] transition-colors duration-300"
      >
        {t("item_79")}
      </Button>
    </div>
  );
}
