// utils/exportToExcel.ts
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportToExcel = (headers: any[], rows: any[]) => {
  const getLeafColumns = (items: any[]): string[] => {
    let result: string[] = [];
    items.forEach((item) => {
      if (!item.children || item.children.length === 0) {
        result.push(item.title);
      } else {
        result = [...result, ...getLeafColumns(item.children)];
      }
    });
    return result;
  };

  const headerTitles = ["T/R", ...getLeafColumns(headers), "Amallar"];

  const excelData = rows.map((row: any, index: number) => {
    const rowData = row.report_items.map((col: any) => col.value ?? "-");
    return [index + 1, ...rowData, ""];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headerTitles, ...excelData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const fileData = new Blob([excelBuffer], {
    type: "application/octet-stream",
  });
  saveAs(fileData, "hisobot.xlsx");
};
