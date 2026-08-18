import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { parseExcelFile, ParsedExcelReport } from "@/utils/parseExcelReport";
import { useParseReportImportMutation } from "@/services/reportsApi";
import {
  ImportParseIssue,
  ImportParseResponse,
  formatImportIssue,
} from "@/types/importReport";
import { getApiErrorMessage } from "@/utils/downloadFile";
import ExcelPreviewModal from "./ExcelPreviewModal";

interface ImportExcelButtonProps {
  reportName?: string;
  /** Statement (jadval) UUID — import-parse API uchun majburiy */
  statementId?: string;
  /** Ixtiyoriy: reja validatsiyasi uchun tashkilot va yil */
  organizationId?: string;
  year?: string | number;
  /** Backend qaytargan ustun UUID + qiymatlar */
  onParsed?: (payload: ImportParseResponse) => void;
  /** API mavjud bo'lmasa — faylning o'zidan o'qilgan ma'lumot (zaxira yo'l) */
  onImportSuccess?: (data: ParsedExcelReport) => void;
  className?: string;
  /**
   * Bo'sh bo'lmasa — import bloklanadi va foydalanuvchiga shu sabab ko'rsatiladi
   * (masalan: avval muddat va tashkilot tanlanishi kerak).
   */
  disabledReason?: string;
}

/** API hali deploy qilinmagan yoki tarmoq yo'q — zaxira yo'lga o'tamiz */
const isEndpointMissing = (error: unknown) => {
  const status = (error as { status?: number | string })?.status;
  return status === 404 || status === "FETCH_ERROR" || status === "PARSING_ERROR";
};

export const ImportExcelButton: React.FC<ImportExcelButtonProps> = ({
  reportName,
  statementId,
  organizationId,
  year,
  onParsed,
  onImportSuccess,
  className,
  disabledReason,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lang = useSelector((state: RootState) => state.language.lang);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedExcelReport | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [parseReportImport, { isLoading: isParsing }] =
    useParseReportImportMutation();

  const handleClick = () => {
    // Muddat/tashkilot tanlanmagan bo'lsa — faylni ochmaymiz, sababini aytamiz
    if (disabledReason) {
      toast.info(disabledReason);
      return;
    }
    fileInputRef.current?.click();
  };

  const closePreview = () => {
    setPreviewData(null);
    setSelectedFile(null);
  };

  /**
   * Backend javobidagi xatolarni ko'rsatamiz.
   * Ular obyekt bo'lib kelishi mumkin — avval matnga aylantiramiz, aks holda
   * toast render paytida butun sahifa yiqiladi.
   *
   * Ogohlantirishlar (warnings) foydalanuvchiga ko'rsatilmaydi: ular ko'pincha
   * texnik izoh (masalan "yashirin UUID qatori topilmadi") bo'lib, import
   * baribir to'g'ri ishlaydi — faqat konsolga yoziladi.
   */
  const reportIssues = (payload: ImportParseResponse) => {
    const toMessages = (issues?: ImportParseIssue[]) =>
      Array.from(
        new Set((issues || []).map(formatImportIssue).filter(Boolean)),
      );

    const warnings = toMessages(payload.warnings);
    const errors = toMessages(payload.errors);

    // Ro'yxat uzun bo'lsa ekranni to'ldirmaymiz — qolganini konsolga yozamiz
    errors.slice(0, 3).forEach((message) => toast.error(message));

    if (warnings.length > 0 || errors.length > 3) {
      console.info("import-parse xabarlari:", { warnings, errors });
    }
  };

  /** API ishlamasa — faylni brauzerda o'qib to'ldiramiz */
  const fallbackToLocalParse = () => {
    if (!previewData) return;

    if (onImportSuccess) {
      onImportSuccess(previewData);
      toast.success(t("excelImportSuccess"));
      closePreview();
      return;
    }

    if (reportName) {
      const state = { importedExcelData: previewData };
      closePreview();
      navigate(`/resource-management/create/${reportName}`, { state });
      return;
    }

    closePreview();
  };

  const handleConfirm = async () => {
    if (!previewData || !selectedFile) return;

    // statement_id bo'lmasa API'ni chaqirib bo'lmaydi
    if (!statementId) {
      fallbackToLocalParse();
      return;
    }

    try {
      const payload = await parseReportImport({
        file: selectedFile,
        statementId,
        lang,
        organizationId: organizationId || undefined,
        year: year || undefined,
      }).unwrap();

      reportIssues(payload);

      const hasData =
        (payload.rows?.length ?? 0) > 0 ||
        (payload.items?.length ?? 0) > 0 ||
        (payload.plants?.length ?? 0) > 0;

      // Backend hech narsa topmadi (masalan ilovalar alohida varaqlarda) —
      // faylni o'zimiz o'qib to'ldiramiz
      if (!hasData) {
        console.info("import-parse bo'sh javob qaytardi — faylni o'zimiz o'qiymiz");
        fallbackToLocalParse();
        return;
      }

      if (onParsed) {
        onParsed(payload);
        if (onImportSuccess && previewData) {
          onImportSuccess(previewData);
        }
        toast.success(t("excelImportSuccess"));
        closePreview();
        return;
      }

      if (reportName) {
        const state = {
          importedPayload: payload,
          importedExcelData: previewData,
        };
        closePreview();
        navigate(`/resource-management/create/${reportName}`, { state });
        return;
      }

      closePreview();
    } catch (error) {
      // Endpoint hali chiqmagan bo'lsa — eski (fayldan o'qish) yo'li bilan davom etamiz
      if (isEndpointMissing(error)) {
        console.warn("import-parse endpoint mavjud emas, faylni o'zimiz o'qiymiz");
        fallbackToLocalParse();
        return;
      }

      console.error("Excel import-parse xatolik:", error);
      toast.error(getApiErrorMessage(error, t("excelImportError")));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setLoading(true);

    try {
      const parsedData = await parseExcelFile(file);

      // Avval faylni Exceldagi ko'rinishda ochamiz, keyin foydalanuvchi davom etadi
      setSelectedFile(file);
      setPreviewData(parsedData);
    } catch (error) {
      console.error("Excel import error:", error);
      toast.error(t("excelImportError"));
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx, .xls"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          disabled={loading}
          onClick={handleClick}
          title={disabledReason || undefined}
          aria-disabled={Boolean(disabledReason)}
          className={`${
            className ||
            "bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-4 h-[40px] rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
          } ${disabledReason ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4" />
          )}
          <span>{t("importExcel")}</span>
        </button>
        {disabledReason && (
          // Orqa fonda rasm bo'lishi mumkin — matn o'qilishi uchun o'z foni bilan
          <span className="text-[11px] leading-snug text-right max-w-[300px] rounded-lg px-2 py-1 bg-white/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs">
            {disabledReason}
          </span>
        )}
      </div>

      <ExcelPreviewModal
        open={Boolean(previewData)}
        onOpenChange={(isOpen) => {
          if (!isOpen) closePreview();
        }}
        data={previewData}
        onConfirm={handleConfirm}
        confirmLoading={isParsing}
      />
    </>
  );
};

export default ImportExcelButton;
