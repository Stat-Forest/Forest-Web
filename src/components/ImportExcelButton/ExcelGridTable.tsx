import React from "react";
import { ExcelGridRow } from "@/utils/parseExcelReport";

interface ExcelGridTableProps {
  grid: ExcelGridRow[];
}

/**
 * Excel varag'ini — birlashtirilgan kataklari (merge), sarlavha va jami qatorlari
 * bilan birga — aynan Exceldagi ko'rinishda chizadi.
 */
export const ExcelGridTable: React.FC<ExcelGridTableProps> = ({ grid }) => (
  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-xs">
    <table className="w-full border-collapse text-xs">
      {/* Merge'lar sarlavha va ma'lumot qatorlari orasidan o'tishi mumkin,
          shuning uchun hammasi bitta tbody ichida chiziladi */}
      <tbody className="text-xs text-slate-800 dark:text-slate-100">
        {grid.map((row, rowIndex) => (
          <tr
            key={`r-${rowIndex}`}
            className={
              row.isHeader
                ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                : row.isTotal
                  ? "font-bold bg-slate-100/70 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            }
          >
            {row.cells.map((cell, cellIndex) =>
              row.isHeader ? (
                <th
                  key={`r-${rowIndex}-${cellIndex}`}
                  colSpan={cell.colSpan}
                  rowSpan={cell.rowSpan}
                  className="border min-w-[140px] border-slate-300 dark:border-slate-700 px-2 py-2 text-center font-bold align-middle whitespace-normal break-words"
                >
                  {cell.value}
                </th>
              ) : (
                <td
                  key={`r-${rowIndex}-${cellIndex}`}
                  colSpan={cell.colSpan}
                  rowSpan={cell.rowSpan}
                  className={`border min-w-[120px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center align-middle whitespace-normal break-words ${
                    cell.isNumeric ? "" : "font-semibold"
                  }`}
                >
                  {cell.value}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default ExcelGridTable;
