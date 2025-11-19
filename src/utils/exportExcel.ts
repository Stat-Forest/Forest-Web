// import * as XLSX from 'xlsx';

// interface HeaderCell {
//     value: string;
//     colspan?: number;
//     rowspan?: number;
// }

// /**
//  * 
//  * @param headerRows 
//  * @param bodyRows 
//  * @param fileName 
//  */
// export const exportToExcel = (
//     headerRows: any[][],
//     bodyRows: any[][],
//     fileName: string
// ) => {
//     try {
//         const wb = XLSX.utils.book_new();
//         const allRows = [...headerRows, ...bodyRows];
//         const ws = XLSX.utils.aoa_to_sheet(allRows);
//         const merges: XLSX.Range[] = [];
//         if (headerRows.length > 0 && headerRows[0].length > 0) {
//             const mainTitle = headerRows[0][0];
//             const totalCols = headerRows[headerRows.length - 1].length;
//             merges.push({
//                 s: { r: 0, c: 0 },
//                 e: { r: 0, c: totalCols - 1 }
//             });
//         }
//         if (headerRows.length > 1) {
//             const secondRow = headerRows[1];
//             let colIndex = 0;

//             secondRow.forEach((cell: string, idx: number) => {
//                 let mergeEnd = idx;
//                 while (
//                     mergeEnd + 1 < secondRow.length &&
//                     secondRow[mergeEnd + 1] === cell
//                 ) {
//                     mergeEnd++;
//                 }

//                 if (mergeEnd > idx) {
//                     merges.push({
//                         s: { r: 1, c: colIndex },
//                         e: { r: 1, c: colIndex + (mergeEnd - idx) }
//                     });
//                 }

//                 colIndex += (mergeEnd - idx + 1);
//             });
//         }


//         if (merges.length > 0) {
//             ws['!merges'] = merges;
//         }

//         const colWidths = Array(headerRows[headerRows.length - 1]?.length || 10)
//             .fill(null)
//             .map(() => ({ wch: 20 }));

//         ws['!cols'] = colWidths;

//         const rowHeights = headerRows.map(() => ({ hpt: 30 }));
//         ws['!rows'] = rowHeights;

//         const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

//         for (let R = 0; R <= range.e.r; R++) {
//             for (let C = 0; C <= range.e.c; C++) {
//                 const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
//                 if (!ws[cellAddress]) continue;


//                 if (R < headerRows.length) {
//                     ws[cellAddress].s = {
//                         font: { bold: true, sz: 12 },
//                         alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
//                         fill: { fgColor: { rgb: 'F0F0F0' } },
//                         border: {
//                             top: { style: 'thin', color: { rgb: '000000' } },
//                             bottom: { style: 'thin', color: { rgb: '000000' } },
//                             left: { style: 'thin', color: { rgb: '000000' } },
//                             right: { style: 'thin', color: { rgb: '000000' } }
//                         }
//                     };
//                 } else {

//                     ws[cellAddress].s = {
//                         alignment: { horizontal: 'center', vertical: 'center' },
//                         border: {
//                             top: { style: 'thin', color: { rgb: '000000' } },
//                             bottom: { style: 'thin', color: { rgb: '000000' } },
//                             left: { style: 'thin', color: { rgb: '000000' } },
//                             right: { style: 'thin', color: { rgb: '000000' } }
//                         }
//                     };
//                 }
//             }
//         }


//         XLSX.utils.book_append_sheet(wb, ws, 'Hisobot');


//         XLSX.writeFile(wb, `${fileName}.xlsx`);

//         console.log('Excel fayl muvaffaqiyatli eksport qilindi!');
//     } catch (error) {
//         console.error('Excel eksport xatosi:', error);
//         throw new Error('Excel faylni yaratishda xatolik yuz berdi!');
//     }
// };

// /**
//  * 
//  * @param headerRows 
//  * @returns 
//  */
// export const processHeadersForMerge = (headerRows: any[][]): any[][] => {
//     if (headerRows.length === 0) return [];

//     const processed: any[][] = [];

//     if (headerRows[0]?.length > 0) {
//         const mainTitle = headerRows[0][0];
//         const totalCols = headerRows[headerRows.length - 1]?.length || 6;
//         processed.push(Array(totalCols).fill(mainTitle));
//     }

//     if (headerRows[1]?.length > 0) {
//         processed.push([...headerRows[1]]);
//     }

//     if (headerRows[2]?.length > 0) {
//         processed.push([...headerRows[2]]);
//     }

//     return processed;
// };

// /**
//  *
//  * @param headers
//  * @returns
//  */
// export const buildMergedHeaders = (headers: any[]): any[][] => {
//     // Maksimal chuqurlikni aniqlash
//     const getDepth = (node: any): number => {
//         if (!node.children || node.children.length === 0) return 1;
//         return 1 + Math.max(...node.children.map(getDepth));
//     };

//     const maxDepth = Math.max(...headers.map(getDepth));
//     const rows: any[][] = Array(maxDepth).fill(null).map(() => []);

//     const fillRows = (node: any, level: number, startCol: number): number => {
//         if (!node.children || node.children.length === 0) {

//             rows[level].push(node.title);
//             for (let i = level + 1; i < maxDepth; i++) {
//                 rows[i].push('');
//             }
//             return startCol + 1;
//         }

//         const childStartCol = startCol;
//         let currentCol = startCol;

//         node.children.forEach((child: any) => {
//             currentCol = fillRows(child, level + 1, currentCol);
//         });

//         const colspan = currentCol - childStartCol;
//         rows[level].push({ value: node.title, colspan });

//         return currentCol;
//     };

//     let colIndex = 0;
//     headers.forEach(header => {
//         colIndex = fillRows(header, 0, colIndex);
//     });

//     return rows;
// };
// utils/exportExcel.ts

import * as XLSX from "xlsx";

interface CellObject {
    v: string;
    colspan?: number;
    rowspan?: number;
}

export type ExcelCell = string | CellObject;
export type ExcelRow = ExcelCell[];


export const exportToExcel = (
    headerRows: ExcelRow[],
    bodyRows: any[][],
    fileName: string
): void => {
    try {
        const workbook = XLSX.utils.book_new();

        const allDataRows: any[][] = [...headerRows.map(processHeaderRow), ...bodyRows];

        const worksheet = XLSX.utils.aoa_to_sheet(allDataRows);

        const merges: XLSX.Range[] = [];

        headerRows.forEach((row, rowIndex) => {
            let currentCol = 0;

            row.forEach((cell) => {
                if (cell === null || cell === undefined || cell === "") {
                    currentCol++;
                    return;
                }

                const cellObj = typeof cell === "string" ? { v: cell } : cell;
                const colspan = cellObj.colspan || 1;
                const rowspan = cellObj.rowspan || 1;

                if (colspan > 1 || rowspan > 1) {
                    merges.push({
                        s: { r: rowIndex, c: currentCol },
                        e: { r: rowIndex + rowspan - 1, c: currentCol + colspan - 1 },
                    });

                    for (let r = rowIndex; r < rowIndex + rowspan; r++) {
                        for (let c = currentCol + 1; c < currentCol + colspan; c++) {
                            if (!allDataRows[r]) allDataRows[r] = [];
                            allDataRows[r][c] = "";
                        }
                    }
                }

                currentCol += colspan;
            });
        });

        if (merges.length > 0) {
            worksheet["!merges"] = merges;
        }

        const maxCols = Math.max(...allDataRows.map((r) => r.length), 7);

        worksheet["!cols"] = Array(maxCols)
            .fill(null)
            .map(() => ({ wch: 20 }));

        worksheet["!rows"] = [
            ...headerRows.map(() => ({ hpt: 36 })),
            ...bodyRows.map(() => ({ hpt: 28 })),
        ];

        const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

        for (let R = 0; R <= range.e.r; R++) {
            for (let C = 0; C <= range.e.c; C++) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = worksheet[cellAddress];

                if (!cell) continue;

                const isHeaderRow = R < headerRows.length;

                cell.s = {
                    font: {
                        name: "Arial",
                        sz: isHeaderRow ? 12 : 11,
                        bold: isHeaderRow,
                        color: isHeaderRow ? { rgb: "000000" } : undefined,
                    },
                    alignment: {
                        horizontal: "center",
                        vertical: "center",
                        wrapText: true,
                    },
                    fill: isHeaderRow
                        ? { fgColor: { rgb: "E8F5E9" } }
                        : undefined,
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } },
                    },
                };
            }
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, "Hisobot");

        const safeFileName = fileName.replace(/[<>:"/\\|?*]/g, "_");
        XLSX.writeFile(workbook, `${safeFileName}.xlsx`);

        console.log("Excel fayl muvaffaqiyatli yaratildi:", safeFileName);
    } catch (error: any) {
        console.error("Excel eksport xatosi:", error);
        alert("Excel faylni yaratishda xatolik yuz berdi: " + error.message);
        throw error;
    }
};

const processHeaderRow = (row: ExcelRow): any[] => {
    return row.map((cell) => {
        if (typeof cell === "string") return cell;
        if (cell && typeof cell === "object" && "v" in cell) {
            return cell.v;
        }
        return "";
    });
};

export const prepareBodyRows = (rows: any[], activeLeafIds: string[]): any[][] => {
    const result: any[][] = [];

    const traverse = (row: any, level: number = 0) => {
        const indent = "   ".repeat(level);

        const baseRow = [
            `${indent}${row.organization_name || row.region_name || row.name || "Noma'lum"}`,
        ];

        const values: any[] = [];

        (row.report_items || []).forEach((item: any) => {
            activeLeafIds.forEach((colId) => {
                const col = item.statement_columns?.find(
                    (c: any) => c.statement_column_id === colId
                );
                values.push(col?.value ?? "-");
            });
        });

        result.push([...baseRow, ...values]);

        if (row.children_reports && row.children_reports.length > 0) {
            row.children_reports.forEach((child: any) => traverse(child, level + 1));
        }
    };

    rows.forEach(traverse);
    return result;
};