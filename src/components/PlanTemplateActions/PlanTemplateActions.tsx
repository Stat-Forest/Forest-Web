import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Download, Loader2, Upload } from "lucide-react";

interface PlanTemplateActionsProps {
  onDownloadTemplate: () => void | Promise<void>;
  onImportFile: (file: File) => void | Promise<void>;
  downloading?: boolean;
  importing?: boolean;
}

/**
 * Reja yaratishda: avval shablonni yuklab olish, keyin to'ldirib import qilish.
 */
export const PlanTemplateActions: React.FC<PlanTemplateActionsProps> = ({
  onDownloadTemplate,
  onImportFile,
  downloading,
  importing,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await onImportFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-xs transition-colors">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onDownloadTemplate}
          disabled={downloading}
          className="h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {t("downloadTemplate")}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx, .xls"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="h-[42px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          {importing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {t("importExcel")}
        </button>
      </div>

      <ol className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <li>1. {t("templateStep1")}</li>
        <li>2. {t("templateStep2")}</li>
        <li>3. {t("templateStep3")}</li>
      </ol>

      <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        {t("templateWarning")}
      </p>
    </div>
  );
};

export default PlanTemplateActions;
