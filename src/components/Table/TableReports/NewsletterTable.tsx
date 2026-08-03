import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { translateStatementName } from "@/utils/i18nHelpers";

interface NewsletterTableProps {
  data: any[];
  currentPage: number;
  perPage: number;
}

function NewsletterTable({ data, currentPage, perPage }: NewsletterTableProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const toggleRow = (id: number, statementName?: string) => {
    navigate(`/resource-management/${id}/${encodeURIComponent(statementName || "")}`);
  };

  // Global raqamni hisoblash: (currentPage - 1) * perPage + index + 1
  const getGlobalIndex = (index: number) => {
    return (currentPage - 1) * perPage + index + 1;
  };

  const formatPeriod = (period: string) => {
    if (!period) return "-";
    if (i18n.language === "ru") {
      const lower = period.toLowerCase();
      if (lower.includes("choraklik") || lower.includes("chorak")) return "Квартальный (3 мес)";
      if (lower.includes("oylik")) return "Ежемесячный";
      if (lower.includes("yillik")) return "Ежегодный";
    }
    return period;
  };

  const formatSubmitAt = (submitAt: string) => {
    if (!submitAt) return "-";
    if (i18n.language === "ru") {
      return submitAt.replace(/CHORAK/g, "КВАРТАЛ");
    }
    return submitAt;
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors shadow-xs">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="bg-slate-100/90 dark:bg-slate-800/90 h-[50px] border-b border-slate-200 dark:border-slate-700">
            <TableHead className="text-slate-700 dark:text-slate-200 border-none text-left pl-5 text-sm font-semibold w-[10%]">
              №
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 border-none text-left text-sm font-semibold w-[40%]">
              {t("item_83")}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 border-none text-left text-sm font-semibold w-[25%]">
              {t("item_14")}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 border-none text-left text-sm font-semibold w-[25%]">
              {t("item_17")}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {data?.map((item, index) => (
            <TableRow
              key={item.id || `newsletter-${index}`}
              className="h-[50px] cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800/60"
              onClick={() => toggleRow(item?.statement?.id, item?.statement?.name)}
            >
              {/* ✅ Global raqam: 1-20, 21-40, 41-60, ... */}
              <TableCell className="text-sm font-medium text-slate-700 dark:text-slate-300 border-none pl-5">
                {getGlobalIndex(index)}
              </TableCell>
              <TableCell className="text-sm font-medium text-slate-800 dark:text-slate-100 border-none whitespace-normal break-words">
                {translateStatementName(item?.statement?.name, i18n.language) || "-"}
              </TableCell>
              <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-300 border-none">
                {formatPeriod(item?.statement?.period)}
              </TableCell>
              <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-300 border-none">
                {formatSubmitAt(item?.submit_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default NewsletterTable;
