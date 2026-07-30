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

function TableReports({ data, deadline_at = false }: any) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="bg-slate-100/90 dark:bg-slate-800/90 h-[44px] border-b border-slate-200 dark:border-slate-700">
            <TableHead className="w-[35%] pl-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-left border-none">
              {t("item_12")}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-left text-xs font-bold uppercase tracking-wider w-[20%] border-none">
              {t("item_83")}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-left text-xs font-bold uppercase tracking-wider w-[15%] border-none">
              {t("item_14")}
            </TableHead>
            <TableHead className="text-slate-700 dark:text-slate-200 text-left text-xs font-bold uppercase tracking-wider w-[15%] border-none">
              {t("item_15")}
            </TableHead>
            {deadline_at && (
              <TableHead className="text-slate-700 dark:text-slate-200 text-left text-xs font-bold uppercase tracking-wider w-[15%] border-none">
                {t("deadline")}
              </TableHead>
            )}

            <TableHead className="text-right pr-3 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider w-[15%] border-none">
              {t("item_16")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {data && data.length > 0 ? (
            data.map((item: any) => (
              <TableRow
                key={item.id}
                className="h-[46px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                onClick={() =>
                  navigate(
                    `/resource-management/${item.statement}/${encodeURIComponent(item?.statement_name || "")}`,
                  )
                }
              >
                <TableCell className="w-[35%] pl-3 text-xs font-semibold text-slate-800 dark:text-slate-100 border-none whitespace-normal break-words leading-snug">
                  {item?.organization_name}
                </TableCell>

                <TableCell className="w-[20%] text-xs font-medium text-slate-700 dark:text-slate-200 border-none whitespace-normal break-words">
                  {item?.statement_name}
                </TableCell>

                <TableCell className="w-[15%] text-xs font-medium text-slate-600 dark:text-slate-300 border-none">
                  {item?.submit_at}
                </TableCell>

                <TableCell className="w-[15%] text-xs font-medium text-slate-600 dark:text-slate-300 border-none">
                  {[
                    item?.accepted_at,
                    item?.cancelled_at,
                    item?.sent_at,
                    item?.created_at,
                  ].find((v) => v != null && v !== "")}
                </TableCell>

                {deadline_at && (
                  <TableCell className="w-[15%] text-xs font-semibold border-none text-red-600 dark:text-red-400">
                    {item?.deadline_at}
                  </TableCell>
                )}

                <TableCell className="text-right pr-3 text-xs font-medium border-none">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold inline-block whitespace-nowrap border ${
                      item.status === "accepted"
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
                        : item.status === "cancelled"
                          ? "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800/60"
                          : item.status == "saved"
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                            : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                    }`}
                  >
                    {item?.status == "accepted"
                      ? t("received")
                      : item.status == "cancelled"
                        ? t("returned")
                        : item.status == "saved"
                          ? t("draft")
                          : t("sended")}
                  </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={deadline_at ? 6 : 5}
                className="text-center py-8"
              >
                <div className="text-slate-500 dark:text-slate-400 text-xs">
                  {t("no_data_available") || "Ma'lumot mavjud emas"}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default TableReports;
