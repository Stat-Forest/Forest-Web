import { useState } from "react";
import { escapeHtml } from "@/features/billing/escapeHtml";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { useExportExcelMutation } from "@/services/reportsApi";
import { getAccessToken } from "@/utils/accessToken";
import { resolveExportUrl } from "@/utils/exportUrl";

interface ExportDropdownProps {
  onExportExcel?: () => void;
  onPrint: () => void;
  reportsData?: any; // Reports data from API (tableRowsData - already filtered by statement)
  tableRef?: React.RefObject<any>; // Table reference for PDF export
  reportName?: string; // Report name for PDF header
  activeTab?: string; // Active tab name for PDF header
  getPrintHTML?: () => string; // Function to get print HTML (from print function)
}

// Recursively collect all report IDs from the data structure
// Note: Only use tableRowsData (filtered by statement), not rupblic
// to ensure all reports belong to the same statement
const collectReportIds = (reports: any): string[] => {
  const ids: string[] = [];
  
  const traverse = (items: any[]) => {
    items.forEach((item) => {
      if (item.id) {
        ids.push(item.id);
      }
      if (item.children_reports && Array.isArray(item.children_reports)) {
        traverse(item.children_reports);
      }
    });
  };
  
  if (reports && typeof reports === 'object') {
    if (reports.results && Array.isArray(reports.results)) {
      traverse(reports.results);
    } else if (Array.isArray(reports)) {
      traverse(reports);
    }
  }
  
  return ids;
};

export default function ExportDropdown({
  onExportExcel,
  onPrint,
  reportsData,
  tableRef,
  reportName = "Reports",
  activeTab = "",
  getPrintHTML,
}: ExportDropdownProps) {
  const { t, i18n } = useTranslation();
  const [exportExcel, { isLoading: isExporting }] = useExportExcelMutation();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportExcel = async () => {
    // If custom handler is provided, use it
    if (onExportExcel) {
      onExportExcel();
      return;
    }

    // Otherwise, use the API endpoint with report IDs
    if (!reportsData) {
      alert("Export qilish uchun ma'lumotlar topilmadi!");
      return;
    }

    // Collect all report IDs from the data
    // Note: reportsData should only contain tableRowsData (filtered by statement)
    // to ensure all reports belong to the same statement
    const reportIds = collectReportIds(reportsData);

    if (reportIds.length === 0) {
      alert("Export qilish uchun hisobotlar topilmadi!");
      return;
    }

    try {
      const lang = i18n.language === "uz" ? "uz" : "ru";

      console.log("Export boshlandi:", {
        report_ids: reportIds,
        lang,
        mode: "json",
        row_numbers: {},
        aggregated: true,
      });

      const result = await exportExcel({
        report_ids: reportIds,
        lang,
        mode: "json",
        row_numbers: {},
        aggregated: true,
      }).unwrap();

      console.log("Export response:", result);

      if (result?.download_url) {
        // Download URL'ni tekshirish va to'g'ri formatlash
        // API origin'idan tashqaridagi URL'ga token yuborilmaydi (audit C9)
        const downloadUrl = resolveExportUrl(result.download_url);
        if (!downloadUrl) {
          alert("Yuklab olish havolasi noto'g'ri");
          return;
        }
        console.log("Download URL:", downloadUrl);

        // Token bilan download URL'ni ochish
        const token = getAccessToken();
        if (token) {
          // Token bilan fetch qilish
          try {
            const response = await fetch(downloadUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = result.filename || "export.xlsx";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);

              if (result?.detail) {
                alert(result.detail);
              }
            } else {
              throw new Error(`Download failed: ${response.status} ${response.statusText}`);
            }
          } catch (downloadError: any) {
            console.error("Download xatolik:", downloadError);
            // Fallback: to'g'ridan-to'g'ri URL'ni ochish
            window.open(downloadUrl, "_blank", "noopener,noreferrer");
          }
        } else {
          // Token bo'lmasa, to'g'ridan-to'g'ri ochish
          window.open(downloadUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        console.warn("Download URL topilmadi, response:", result);
        alert(result?.detail || "Export muvaffaqiyatli bajarildi, lekin download URL topilmadi");
      }
    } catch (error: any) {
      console.error("Export xatolik:", error);
      console.error("Error details:", {
        status: error?.status,
        data: error?.data,
        message: error?.message,
      });

      // Xatolik xabarini ko'rsatish
      const errorMessage =
        error?.data?.detail ||
        error?.data?.message ||
        error?.message ||
        "Export qilishda xatolik yuz berdi";

      alert(`Export xatolik: ${errorMessage}`);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);

    try {
      let printHTML = "";

      // Agar getPrintHTML funksiyasi mavjud bo'lsa, uni ishlatish
      if (getPrintHTML) {
        printHTML = getPrintHTML();
      } else {
        // Aks holda, tableRef dan ma'lumot olish
        if (!tableRef?.current) {
          alert("PDF export qilish uchun jadval topilmadi!");
          setIsExportingPdf(false);
          return;
        }

        const printContents =
          tableRef.current.getPrintableTable?.() || tableRef.current.getTable?.();

        if (!printContents) {
          alert("PDF export qilish uchun ma'lumotlar topilmadi!");
          setIsExportingPdf(false);
          return;
        }

        // Print funksiyasidagi HTML formatini ishlatish
        printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${escapeHtml(reportName)} - Hisobot</title>
            <style>
              body { 
                font-family: 'Arial', sans-serif; 
                margin: 25px;
                direction: ${i18n.dir()};
                color: #000;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 30px;
                font-size: 11px;
                table-layout: fixed;
              }
              th, td { 
                border: 1px solid #000; 
                padding: 8px 6px; 
                text-align: center;
                vertical-align: middle;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              th { 
                background-color: #f8f9fa !important; 
                font-weight: bold;
                font-size: 10px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              td {
                font-size: 10px;
              }
              thead {
                display: table-header-group;
              }
              tbody {
                display: table-row-group;
              }
              .print-header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #000;
                padding-bottom: 15px;
              }
              .print-title {
                font-size: 22px;
                font-weight: bold;
                margin-bottom: 8px;
                text-transform: uppercase;
              }
              .print-subtitle {
                font-size: 16px;
                color: #444;
                margin-bottom: 5px;
              }
              .print-date {
                font-size: 14px;
                color: #666;
              }
              .print-section {
                margin-bottom: 20px;
              }
              .print-section-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
                background-color: #f0f0f0;
                padding: 8px 12px;
                border-left: 4px solid #3B82F6;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              .mt-8 {
                margin-top: 30px;
                display: flex;
                align-items: center;
                gap: 16px;
              }
              .mt-8 h2 {
                margin: 0;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="print-header">
              <div class="print-title">${escapeHtml(reportName)}</div>
              ${activeTab ? `<div class="print-subtitle">${escapeHtml(activeTab)}</div>` : ""}
              <div class="print-date">${new Date().toLocaleDateString(
                "uz-UZ",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                }
              )}</div>
            </div>
            
            <div class="print-section">
              <div class="print-section-title">Hisobot ma'lumotlari</div>
              ${printContents}
            </div>
          </body>
        </html>
      `;
      }

      // HTML dan rasm yaratish
      const printWindow = window.open("", "_blank", "width=1200,height=800");
      if (!printWindow) {
        alert("Yangi oyna ochib bo'lmadi!");
        setIsExportingPdf(false);
        return;
      }

      printWindow.document.write(printHTML);
      printWindow.document.close();

      // HTML yuklanishini kutish
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // jsPDF va html2canvas (~300 KB) faqat shu yerda kerak — sahifa bilan emas,
      // bosilganda yuklanadi
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      // HTML dan canvas yaratish
      const canvas = await html2canvas(printWindow.document.body, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: printWindow.document.body.scrollWidth,
        height: printWindow.document.body.scrollHeight,
        windowWidth: printWindow.document.body.scrollWidth,
        windowHeight: printWindow.document.body.scrollHeight,
      });

      // Canvas dan PDF yaratish
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;

      // Agar rasm bir sahifadan katta bo'lsa, bir nechta sahifaga bo'lish
      let heightLeft = imgScaledHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgScaledWidth, imgScaledHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgScaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgScaledWidth, imgScaledHeight);
        heightLeft -= pdfHeight;
      }

      // PDF ni yuklab olish
      const pdfFileName = `${reportName}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(pdfFileName);

      // Print window ni yopish
      printWindow.close();
    } catch (error: any) {
      console.error("PDF Export xatolik:", error);
      const errorMessage =
        error?.message || "PDF export qilishda xatolik yuz berdi";
      alert(`PDF Export xatolik: ${errorMessage}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-[40px] px-4 font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isExporting}
        >
          {isExporting ? t("exporting") || "Export qilinmoqda..." : t("export")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mt-2 ml-20">
        <DropdownMenuItem onClick={handleExportPdf} disabled={isExporting || isExportingPdf}>
          {isExportingPdf ? t("exporting") || "PDF export qilinmoqda..." : t("exportPdf") || "PDF ga export"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting || isExportingPdf}>
          {t("exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPrint}>
          {t("printReport")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
