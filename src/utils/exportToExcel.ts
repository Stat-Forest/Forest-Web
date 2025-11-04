// utils/exportToExcel.js
import * as XLSX from "xlsx";

export const exportToExcel = (headerRows, bodyRows, fileName = "report") => {
  try {
    // Workbook yaratish
    const wb = XLSX.utils.book_new();

    // Header va body ma'lumotlarini birlashtirish
    const excelData = [];

    // Header qatorlarini qo'shish
    headerRows.forEach((headerRow) => {
      excelData.push(headerRow);
    });

    // Body qatorlarini qo'shish
    bodyRows.forEach((bodyRow) => {
      excelData.push(bodyRow);
    });

    // Worksheet yaratish
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Styl uchun cell range
    const range = XLSX.utils.decode_range(ws["!ref"]);

    // Header qatorlariga style berish
    for (let row = range.s.r; row < headerRows.length; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cellAddress]) {
          // Header style
          if (!ws[cellAddress].s) {
            ws[cellAddress].s = {};
          }
          ws[cellAddress].s = {
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
        }
      }
    }

    // Body qatorlariga style berish
    for (let row = headerRows.length; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cellAddress]) {
          if (!ws[cellAddress].s) {
            ws[cellAddress].s = {};
          }
          ws[cellAddress].s = {
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
            alignment: { horizontal: "center", vertical: "center" },
          };
        }
      }
    }

    // Column enlarini sozlash
    const colWidths = [];
    if (excelData[0]) {
      excelData[0].forEach((_, colIndex) => {
        let maxLength = 15; // Minimal kenglik
        excelData.forEach((row) => {
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
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const link = document.createElement("a");
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
