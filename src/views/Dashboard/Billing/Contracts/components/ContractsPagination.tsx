import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface ContractsPaginationProps {
  page: number;
  perPage: number;
  count: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

/** LandDocumentsContainers'dagi sahifalash bilan bir xil ko'rinish. */
function ContractsPagination({ page, perPage, count, disabled, onPageChange }: ContractsPaginationProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(count / perPage));
  const start = count === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, count);

  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  const pages: number[] = [];
  for (let i = startPage; i <= endPage; i++) pages.push(i);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
      <div className="text-sm text-slate-600 dark:text-slate-400">
        {t("records", { start, end, total: count })}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1 || disabled}
          onClick={() => onPageChange(page - 1)}
        >
          {t("before")}
        </Button>
        <div className="flex items-center">
          {pages.map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={p === page ? "default" : "outline"}
              className={`mx-1 min-w-[40px] ${p === page ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
              disabled={disabled}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages || disabled}
          onClick={() => onPageChange(page + 1)}
        >
          {t("next")}
        </Button>
      </div>

      <div className="text-sm text-slate-600 dark:text-slate-400">
        {t("page")} {page} / {totalPages}
      </div>
    </div>
  );
}

export default ContractsPagination;
