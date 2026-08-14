import React from "react";
import { useTranslation } from "react-i18next";
import { Download, Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { useGetReportImportTemplateMutation } from "@/services/reportsApi";
import { triggerBlobDownload, getApiErrorMessage } from "@/utils/downloadFile";
import { toast } from "react-toastify";

interface ImportTemplateButtonProps {
  /** Statement (jadval) UUID */
  statementId?: string;
  className?: string;
}

/**
 * Hisobotni import qilish uchun bo'sh Excel shablonini yuklab beradi.
 * GET /reports/import-template/?statement_id=...&lang=...
 */
export const ImportTemplateButton: React.FC<ImportTemplateButtonProps> = ({
  statementId,
  className,
}) => {
  const { t } = useTranslation();
  const lang = useSelector((state: RootState) => state.language.lang);
  const [getTemplate, { isLoading }] = useGetReportImportTemplateMutation();

  const handleClick = async () => {
    if (!statementId) return;

    try {
      const { blob, filename } = await getTemplate({
        statementId,
        lang,
      }).unwrap();

      triggerBlobDownload(blob, filename);
      toast.success(t("templateDownloaded"));
    } catch (error) {
      console.error("Shablon yuklab olishda xatolik:", error);
      toast.error(getApiErrorMessage(error, t("error_occurred")));
    }
  };

  if (!statementId) return null;

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={handleClick}
      className={
        className ||
        "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold px-4 h-[40px] rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
      }
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span>{t("downloadTemplate")}</span>
    </button>
  );
};

export default ImportTemplateButton;
