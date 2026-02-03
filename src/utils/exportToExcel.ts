import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportReportsToExcel = (
  data: any[],
  t: (key: string) => string,
  deadline_at: boolean,
) => {
  const formattedData = data.map((item, index) => ({
    "№": index + 1,
    [t("item_12")]: item.organization_name,
    [t("item_83")]: item.statement_name,
    [t("item_14")]: item.submit_at,
    [t("item_15")]:
      item.accepted_at || item.cancelled_at || item.sent_at || item.created_at,
    ...(deadline_at && { [t("deadline")]: item.deadline_at }),
    [t("item_16")]:
      item.status === "accepted"
        ? t("received")
        : item.status === "cancelled"
          ? t("returned")
          : item.status === "saved"
            ? t("draft")
            : t("sended"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, "reports.xlsx");
};
