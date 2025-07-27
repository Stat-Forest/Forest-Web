// src/utils/exportToExcel.ts
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportToExcel = (headerRows: any[][], bodyRows: any[][]) => {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  // 1. Sarlavhalarni joylash
  headerRows.forEach((row, rowIndex) => {
    let colIndex = 0;

    row.forEach((cell: any) => {
      while (worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })]) {
        colIndex++;
      }

      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });

      worksheet[cellRef] = {
        v: cell.title,
        t: "s",
        s: {
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },
          font: { bold: true },
        },
      };

      const colSpan = cell.colSpan || 1;
      const rowSpan = cell.rowSpan || 1;

      if (colSpan > 1 || rowSpan > 1) {
        if (!worksheet["!merges"]) worksheet["!merges"] = [];
        worksheet["!merges"].push({
          s: { r: rowIndex, c: colIndex },
          e: { r: rowIndex + rowSpan - 1, c: colIndex + colSpan - 1 },
        });
      }

      colIndex += colSpan;
    });
  });

  // 2. Body data yozish
  const rowOffset = headerRows.length;
  bodyRows.forEach((row, rIndex) => {
    row.forEach((value, cIndex) => {
      const ref = XLSX.utils.encode_cell({
        r: rowOffset + rIndex,
        c: cIndex,
      });

      worksheet[ref] = {
        v: value,
        t: typeof value === "number" ? "n" : "s",
        s: {
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },
        },
      };
    });
  });

  // 3. Border
  const maxCols = Math.max(
    ...[...headerRows.map((r) => r.length), ...bodyRows.map((r) => r.length)]
  );
  const totalRows = rowOffset + bodyRows.length;

  const range = {
    s: { r: 0, c: 0 },
    e: { r: totalRows - 1, c: maxCols - 1 },
  };

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell) continue;
      if (!cell.s) cell.s = {};
      cell.s.border = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      };
    }
  }

  // 4. Style
  worksheet["!cols"] = new Array(maxCols).fill({ wch: 25 });
  worksheet["!rows"] = new Array(totalRows).fill({ hpt: 40 });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hisobot");

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  });

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, "hisobot.xlsx");
};
