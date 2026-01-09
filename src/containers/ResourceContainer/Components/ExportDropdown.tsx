import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { useExportExcelMutation } from "@/services/reportsApi";
import { decryptData } from "@/utils/crypto";

interface ExportDropdownProps {
  onExportExcel?: () => void;
  onPrint: () => void;
  reportsData?: any; // Reports data from API (tableRowsData - already filtered by statement)
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
}: ExportDropdownProps) {
  const { t, i18n } = useTranslation();
  const [exportExcel, { isLoading: isExporting }] = useExportExcelMutation();

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
        let downloadUrl = result.download_url;

        // Agar URL nisbiy bo'lsa (faqat path), base_url qo'shish
        if (downloadUrl.startsWith("/")) {
          const baseUrl = import.meta.env.VITE_API_URL || "https://forest.yutori.uz/api/v1";
          downloadUrl = `${baseUrl}${downloadUrl}`;
        } else if (!downloadUrl.startsWith("http://") && !downloadUrl.startsWith("https://")) {
          // Agar protocol bo'lmasa, base_url qo'shish
          const baseUrl = import.meta.env.VITE_API_URL || "https://forest.yutori.uz/api/v1";
          downloadUrl = `${baseUrl}/${downloadUrl}`;
        }

        console.log("Download URL:", downloadUrl);

        // Token bilan download URL'ni ochish
        const token = decryptData("token", "token");
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
            window.open(downloadUrl, "_blank");
          }
        } else {
          // Token bo'lmasa, to'g'ridan-to'g'ri ochish
          window.open(downloadUrl, "_blank");
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="py-2.5 font-semibold w-full md:w-[150px] rounded bg-[#3B82F6] border-1 text-[white] hover:bg-[#2563EB] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          data-aos="zoom-in"
          data-aos-delay="50"
          disabled={isExporting}
        >
          {isExporting ? t("exporting") || "Export qilinmoqda..." : t("export")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mt-2 ml-20">
        <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting}>
          {t("exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPrint}>
          {t("printReport")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
