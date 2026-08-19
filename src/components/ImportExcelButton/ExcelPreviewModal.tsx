import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ParsedExcelReport } from "@/utils/parseExcelReport";
import { findSpecialExcelColumns } from "@/utils/matchExcelColumns";
import ExcelGridTable from "./ExcelGridTable";

interface ExcelPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ParsedExcelReport | null;
  organizationName?: string;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmLoading?: boolean;
}

/**
 * Import qilingan Excel faylni — merge'lari, sarlavhalari va jami qatorlari bilan
 * birga — Exceldagi ko'rinishda chiqaradi.
 */
export const ExcelPreviewModal: React.FC<ExcelPreviewModalProps> = ({
  open,
  onOpenChange,
  data,
  organizationName: propOrganizationName,
  onConfirm,
  confirmLabel,
  confirmLoading,
}) => {
  const { t } = useTranslation();

  // Fayldagi varaqlar (har bir ilova alohida varaqda bo'lishi mumkin)
  const sheets = useMemo(() => {
    const parsed = (data?.sheets || []).filter(
      (sheet) => sheet.grid.length > 0,
    );
    if (parsed.length > 0) return parsed;

    return data?.grid?.length
      ? [
          {
            name: data.sheetNames?.[0] || "",
            grid: data.grid,
            columnCount: data.columnCount,
            headerChains: data.headerChains,
            dataRows: data.dataRows,
          },
        ]
      : [];
  }, [data]);

  const [activeSheet, setActiveSheet] = useState(0);

  // Yangi fayl ochilganda birinchi varaqdan boshlaymiz
  useEffect(() => {
    setActiveSheet(0);
  }, [data]);

  const grid = useMemo(
    () => sheets[activeSheet]?.grid || [],
    [sheets, activeSheet],
  );

  // Tashkilot nomi: avval prop orqali uzatilgan tashkilot nomi, aks holda Excelda "Tashkilot" ustuni bo'lsa o'sha ustundan
  const organizationName = useMemo(() => {
    if (propOrganizationName) return propOrganizationName;
    const currentSheet = sheets[activeSheet];
    if (!currentSheet?.headerChains || !currentSheet?.dataRows?.length) return "";
    const special = findSpecialExcelColumns(currentSheet.headerChains);
    if (special.organizationIndex >= 0) {
      return currentSheet.dataRows[0]?.cells[special.organizationIndex]?.trim() || "";
    }
    return "";
  }, [propOrganizationName, sheets, activeSheet]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            {data?.fileName || t("excelPreviewTitle")}
          </DialogTitle>
        </DialogHeader>

        {organizationName && (
          <div className="text-sm sm:text-base text-slate-800 dark:text-slate-100">
            <b className="font-bold">{t("item_12")}:</b> {organizationName}
          </div>
        )}

        {/* Exceldagi kabi varaq tablari — har bir ilova alohida varaqda bo'lishi mumkin */}
        {sheets.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {sheets.map((sheet, index) => (
              <button
                key={`${sheet.name}-${index}`}
                type="button"
                onClick={() => setActiveSheet(index)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  index === activeSheet
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {sheet.name || `${index + 1}`}
              </button>
            ))}
          </div>
        )}

        {grid.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {t("excelImportEmpty")}
          </div>
        ) : (
          <div className="mt-2">
            <ExcelGridTable grid={grid} />
          </div>
        )}

        <div className="flex justify-end items-center gap-2.5 mt-4 flex-wrap">
          <Button
            onClick={() => onOpenChange(false)}
            className="h-[40px] px-4 font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95"
          >
            {t("excelPreviewClose")}
          </Button>
          {onConfirm && (
            <Button
              onClick={onConfirm}
              disabled={confirmLoading}
              className="h-[40px] px-4 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              {confirmLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmLabel || t("excelPreviewContinue")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExcelPreviewModal;
