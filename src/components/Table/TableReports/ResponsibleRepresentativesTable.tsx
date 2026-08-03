import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

interface ResponsibleRepresentativesTableProps {
  data: any[];
  currentPage: number;
  perPage: number;
}

function ResponsibleRepresentativesTable({
  data,
  currentPage,
  perPage,
}: ResponsibleRepresentativesTableProps) {
  const { t, i18n } = useTranslation();

  // Global raqamni hisoblash: (currentPage - 1) * perPage + index + 1
  const getGlobalIndex = (index: number) => {
    return (currentPage - 1) * perPage + index + 1;
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors shadow-xs">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="bg-slate-100/90 dark:bg-slate-800/90 h-[50px] border-b border-slate-200 dark:border-slate-700">
            <TableHead className="w-[4%] text-left text-sm font-semibold text-slate-700 dark:text-slate-200 border-none pl-3">
              №
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-left text-sm font-semibold w-[12%] border-none">
              {t("item_19") /* First name */}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-left text-sm font-semibold w-[12%] border-none">
              {t("item_20") /* Last name */}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-left text-sm font-semibold w-[18%] border-none">
              {t("item_12") /* Organization */}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-left text-sm font-semibold w-[18%] border-none">
              {t("statments_name") /* Organization */}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-left text-sm font-semibold w-[10%] border-none">
              {t("item_21") /* Nationality */}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-left text-sm font-semibold w-[14%] border-none">
              {t("item_22") /* Phone */}
            </TableHead>
            <TableHead className="text-right text-slate-700 dark:text-slate-200 text-sm font-semibold w-[14%] border-none pr-3">
              {t("item_23") /* Role */}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {data?.map((item: any, index: number) => (
            <TableRow
              className="h-[50px] hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800/60"
              key={item.user_number || index}
            >
              <TableCell className="w-[4%] text-sm font-medium text-slate-700 dark:text-slate-300 border-none pl-3">
                {getGlobalIndex(index)}
              </TableCell>
              <TableCell className="w-[12%] text-sm font-medium text-slate-800 dark:text-slate-100 border-none">
                {item?.first_name || "-"}
              </TableCell>
              <TableCell className="w-[12%] text-sm font-medium text-slate-800 dark:text-slate-100 border-none">
                {item?.last_name || "-"}
              </TableCell>
              <TableCell className="w-[18%] text-sm font-medium text-slate-700 dark:text-slate-200 border-none whitespace-normal break-words">
                {i18n.language === "ru" &&
                (item?.organization_name === "O'rmon xo'jaligini raqamlashtirish markazi davlat muassasasi" ||
                  !item?.organization_name)
                  ? t("compny_name")
                  : item?.organization_name || "-"}
              </TableCell>
              <TableCell className="w-[18%] text-sm font-medium text-slate-700 dark:text-slate-200 border-none whitespace-normal break-words">
                {item?.statement_name || "-"}
              </TableCell>
              <TableCell className="w-[10%] text-sm font-medium text-slate-600 dark:text-slate-300 border-none">
                {i18n.language === "ru" && (item?.nationality === "Uzbek" || item?.nationality === "O'zbek")
                  ? "Узбек"
                  : item?.nationality || "-"}
              </TableCell>
              <TableCell className="w-[14%] text-sm font-medium text-slate-600 dark:text-slate-300 border-none">
                {item?.phone_number || "-"}
              </TableCell>
              <TableCell className="w-[14%] text-right text-sm font-medium text-slate-700 dark:text-slate-200 border-none pr-3">
                {item?.role && t(`roles.${item.role}`) !== `roles.${item.role}`
                  ? t(`roles.${item.role}`)
                  : item?.role_display || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default ResponsibleRepresentativesTable;
