// utils/exportToExcel.ts
import * as XLSX from "xlsx";

interface CellStyle {
  font?: {
    bold?: boolean;
    color?: { rgb: string };
  };
  fill?: {
    fgColor?: { rgb: string };
  };
  alignment?: {
    horizontal?: "center" | "left" | "right";
    vertical?: "center" | "top" | "bottom";
  };
  border?: {
    top?: { style: "thin" | "medium" | "thick"; color: { rgb: string } };
    left?: { style: "thin" | "medium" | "thick"; color: { rgb: string } };
    bottom?: { style: "thin" | "medium" | "thick"; color: { rgb: string } };
    right?: { style: "thin" | "medium" | "thick"; color: { rgb: "000000" } };
  };
}

export const exportToExcel = (
  headerRows: any[][],
  bodyRows: any[][],
  fileName: string = "report"
): void => {
  try {
    // Workbook yaratish
    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    // Header va body ma'lumotlarini birlashtirish
    const excelData: any[][] = [];

    // Header qatorlarini qo'shish
    headerRows.forEach((headerRow: any[]) => {
      excelData.push(headerRow);
    });

    // Body qatorlarini qo'shish
    bodyRows.forEach((bodyRow: any[]) => {
      excelData.push(bodyRow);
    });

    // Worksheet yaratish
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(excelData);

    // Styl uchun cell range
    if (!ws["!ref"]) {
      throw new Error("Worksheet ma'lumotlari topilmadi");
    }

    const range: XLSX.Range = XLSX.utils.decode_range(ws["!ref"]);

    // Header qatorlariga style berish
    for (let row = range.s.r; row < headerRows.length; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress: string = XLSX.utils.encode_cell({ r: row, c: col });
        const cell: XLSX.CellObject | undefined = ws[cellAddress];
        if (cell) {
          // Header style
          const headerStyle: CellStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "09B86F" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
          };
          cell.s = headerStyle;
        }
      }
    }

    // Body qatorlariga style berish
    for (let row = headerRows.length; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress: string = XLSX.utils.encode_cell({ r: row, c: col });
        const cell: XLSX.CellObject | undefined = ws[cellAddress];
        if (cell) {
          const bodyStyle: CellStyle = {
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
            alignment: { horizontal: "center", vertical: "center" },
          };
          cell.s = bodyStyle;
        }
      }
    }

    // Column enlarini sozlash
    const colWidths: XLSX.ColInfo[] = [];
    if (excelData[0]) {
      excelData[0].forEach((_, colIndex: number) => {
        let maxLength: number = 15; // Minimal kenglik
        excelData.forEach((row: any[]) => {
          if (row[colIndex] && row[colIndex].toString().length > maxLength) {
            maxLength = row[colIndex].toString().length;
          }
        });
        colWidths.push({ wch: Math.min(maxLength + 2, 50) }); // Maksimal 50
      });
      ws["!cols"] = colWidths;
    }

    // Worksheetni workbookga qo'shish
    XLSX.utils.book_append_sheet(wb, ws, "Hisobot");

    // Faylni yuklab olish
    const excelBuffer: ArrayBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    }) as ArrayBuffer;

    const blob: Blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const link: HTMLAnchorElement = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName.replace(/[^a-z0-9]/gi, "_")}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Excel export error:", error);
    throw new Error("Excel faylni yaratishda xatolik yuz berdi");
  }
};
