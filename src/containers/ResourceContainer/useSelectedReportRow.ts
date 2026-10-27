import { useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetReportFullQuery } from "@/services/reportsApi";
import { ReportRow } from "@/types/reportInterface";

/**
 * Hisobotlar ro'yxati compact (report_items'siz) yuklanadi; qator tanlanganda shu
 * hisobot to'liq olinadi. To'liq ma'lumot kelguncha sarlavha qismi ro'yxat qatoridan.
 */
export function useSelectedReportRow(statementId: string | undefined, lang: string) {
  const [pickedRow, setSelectedRow] = useState<ReportRow | null>(null);
  const { data: fullRow } = useGetReportFullQuery(
    pickedRow && statementId ? { id: String(pickedRow.id), statement: statementId, lang } : skipToken,
  );
  return { pickedRow, fullRow, setSelectedRow };
}

type StatementColumnValue = ReportRow["report_items"][number]["statement_columns"][number];

/** Tanlangan hisobot ustunlarini faol tab'ning barg ustunlariga moslash (topilmaganlari "-"). */
export function normalizeSelectedRow(
  pickedRow: ReportRow | null,
  fullRow: ReportRow | null | undefined,
  activeLeafIds: string[],
): ReportRow | null {
  if (!pickedRow) return null;
  const base = fullRow && String(fullRow.id) === String(pickedRow.id) ? fullRow : pickedRow;
  const reportItems = (base.report_items || []).map((reportItem) => ({
    ...reportItem,
    statement_columns: activeLeafIds.map(
      (colId) =>
        (reportItem.statement_columns || []).find((c) => c.statement_column_id === colId) ||
        ({ statement_column_id: colId, value: "-", inners: [] } as unknown as StatementColumnValue),
    ),
  }));
  return { ...base, report_items: reportItems };
}
