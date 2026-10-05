import {
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Edit2,
  MessageSquareWarning,
  NotebookText,
  Trash2,
  Save,
  Send,
  XCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base_url } from "@/services/baseUrl";
import {
  useAcceptReportMutation,
  useDeleteReportMutation,
  useGetReportPlantByIdQuery,
  useExportExcelMutation,
} from "@/services/reportsApi";
import { skipToken } from "@reduxjs/toolkit/query";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { decryptData } from "@/utils/crypto";
import CancelReportModal from "@/components/Modals/CancelReportModal";
import SignAndSendDialog from "@/components/Reports/SignAndSendDialog";
import SignatureBadge from "@/components/Reports/SignatureBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { regions2, statuses } from "@/services/constants";

const getQuarterStatusConfig = (status: string | null | undefined) => {
  switch (status) {
    case "saved":
      return {
        label: "Qoralama",
        color:
          "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 shadow-xs",
        Icon: Save,
      };
    case "sent":
      return {
        label: "Jo'natilgan",
        color:
          "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 shadow-xs",
        Icon: Send,
      };
    case "cancelled":
      return {
        label: "Qaytarilgan",
        color:
          "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 shadow-xs",
        Icon: XCircle,
      };
    case "accepted":
      return {
        label: "Qabul qilingan",
        color:
          "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 shadow-xs",
        Icon: CheckCircle2,
      };
    default:
      return {
        label: "Mavjud emas",
        color:
          "bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 shadow-xs",
        Icon: Clock,
      };
  }
};

const PlantTableColumn = forwardRef(
  (
    {
      data = [],
      rows = [],
      onRowClick,
      selectedRow,
      allReports,
      individualRows: _individualRows = [],
      setSelectedOrganizationReport,
      setSelectedPeriodReport,
      setSelectedStatusReport,
      setSearchTermReport,
      selectedOrganizationReport,
      selectedStatusReport,
      searchTermReport,
      reportName,
      isFinance = false,
    }: any,
    ref,
  ) => {
    const isDaromad = Boolean(
      isFinance ||
      reportName?.toLowerCase()?.includes("daromad") ||
      reportName?.toLowerCase()?.includes("доход") ||
      (typeof window !== "undefined" && (
        window.location.pathname.toLowerCase().includes("daromad") ||
        window.location.pathname.toLowerCase().includes("доход")
      ))
    );

    const tableRef = useRef<HTMLDivElement>(null);
    const detailRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Detail ko'rinishga smooth scroll
    useEffect(() => {
      if (selectedRow) {
        detailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, [selectedRow]);
    const { t, i18n } = useTranslation();
    const user_role = useSelector((state: RootState) => state.auth.user?.role);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [deleteReport] = useDeleteReportMutation();
    const [acceptReport, { isLoading: isAccepting }] =
      useAcceptReportMutation();
    const [acceptedReports, setAcceptedReports] = useState(new Set());
    const [exportExcel, { isLoading: isExporting }] = useExportExcelMutation();

    // Export Excel funksiyasi
    const handleExportExcel = async () => {
      if (!selectedRow?.id) {
        alert("Export qilish uchun hisobot tanlang");
        return;
      }

      try {
        const lang = i18n.language === "uz" ? "uz" : "ru";

        console.log("Export boshlandi:", {
          report_ids: [selectedRow.id],
          lang,
          mode: "json",
        });

        const result = await exportExcel({
          report_ids: [selectedRow.id],
          lang,
          mode: "json",
        }).unwrap();

        console.log("Export response:", result);

        if (result?.download_url) {
          // Download URL'ni tekshirish va to'g'ri formatlash
          let downloadUrl = result.download_url;

          // Agar URL nisbiy bo'lsa (faqat path), base_url qo'shish
          if (downloadUrl.startsWith("/")) {
            downloadUrl = `${base_url}${downloadUrl}`;
          } else if (
            !downloadUrl.startsWith("http://") &&
            !downloadUrl.startsWith("https://")
          ) {
            // Agar protocol bo'lmasa, base_url qo'shish
            downloadUrl = `${base_url}/${downloadUrl}`;
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
                throw new Error(
                  `Download failed: ${response.status} ${response.statusText}`,
                );
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
          alert(
            result?.detail ||
            "Export muvaffaqiyatli bajarildi, lekin download URL topilmadi",
          );
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

    // PlantTableColumn faqat plant detail uchun ishlatiladi
    const isPlantStatement = true;

    const { data: plantDetail, isLoading: isPlantDetailLoading } =
      useGetReportPlantByIdQuery(
        isPlantStatement && selectedRow?.id
          ? { id: String(selectedRow.id), is_user_input: "" }
          : skipToken,
      );

    const detailQuarterInfo =
      (plantDetail as any)?.quarter_info ?? selectedRow?.quarter_info;
    const detailQuarter = (plantDetail as any)?.quarter ?? selectedRow?.quarter;

    const currentQuarterNum = String(detailQuarter || "").match(/\d/)?.[0];
    const activeQuarterStatus =
      selectedRow?.statement_name === "Daromad" && currentQuarterNum && detailQuarterInfo
        ? detailQuarterInfo[`quarter_${currentQuarterNum}_status`]
        : null;
    const effectiveStatus = activeQuarterStatus || selectedRow?.status;

    // Plant detail kelganda: selectedRow dagi column tartibini saqlab qolish uchun shunga moslab normalize qilamiz
    const expectedColumnIds: string[] =
      selectedRow?.report_items?.[0]?.statement_columns?.map(
        (c: any) => c.statement_column_id,
      ) || [];

    const normalizedPlantReportItems = (plantDetail as any)?.report_items
      ? ((plantDetail as any).report_items || []).map((reportItem: any) => {
        const cols = reportItem.statement_columns || [];
        const normalizedColumns =
          expectedColumnIds.length > 0
            ? expectedColumnIds.map((colId) => {
              const found = cols.find(
                (c: any) => c.statement_column_id === colId,
              );
              return (
                found || {
                  statement_column_id: colId,
                  value: "-",
                  inners: [],
                }
              );
            })
            : cols;

        return { ...reportItem, statement_columns: normalizedColumns };
      })
      : [];

    const formatInnerValue = (inner: any) => {
      if (!inner) return "";
      // Plant-report ustunlarida oddiy raqam/qiymat chiqsin, plant_name faqat tashkilot nomi column ichida bo'ladi
      return inner.value ?? "";
    };

    const isOrganizationColumn = (col: any) => {
      if (col?.is_organization === true) return true;
      const name = (
        col?.statement_column_name ??
        col?.statement_column_title ??
        col?.title ??
        ""
      )
        .toString()
        .toLowerCase();
      return (
        name.includes("tashkilot") ||
        name.includes("организаци") ||
        name.includes("ташкилот")
      );
    };

    const isPlantColumn = (col: any) => {
      if (
        col?.is_virtual === true ||
        col?.statement_column_id === "plant_name_virtual" ||
        col?.id === "plant_name_virtual"
      ) {
        return true;
      }
      const name = (
        col?.statement_column_name ??
        col?.statement_column_title ??
        col?.title ??
        ""
      )
        .toString()
        .toLowerCase();
      return (
        name === "o'simlik nomi" ||
        name === "osimlik nomi" ||
        name === "o‘simlik nomi" ||
        name === "o`simlik nomi" ||
        name === "название растения" ||
        name === "наименование растения" ||
        name === "ўсимлик номи" ||
        name === "daromad manbalari" ||
        name === "daromad manbai" ||
        name === "источники дохода" ||
        name === "источник дохода" ||
        name === "plant_name" ||
        (name.includes("o'simlik") && name.includes("nomi")) ||
        (name.includes("osimlik") && name.includes("nomi")) ||
        (name.includes("o‘simlik") && name.includes("nomi")) ||
        (name.includes("o`simlik") && name.includes("nomi")) ||
        (name.includes("daromad") && name.includes("manba")) ||
        (name.includes("доход") && name.includes("источник")) ||
        (name.includes("растени") &&
          (name.includes("назван") || name.includes("наименов")))
      );
    };

    const formatCellValue = (val: any) => {
      if (val === undefined || val === null || val === "" || val === "-") return "-";
      const numStr = String(val).replace(/\s/g, "").replace(",", ".");
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        return num.toFixed(2);
      }
      return val;
    };

    const calculateColumnTotal = (col: any) => {
      if (
        col?.value !== undefined &&
        col?.value !== null &&
        col?.value !== "-" &&
        col?.value !== ""
      ) {
        const num = parseFloat(
          String(col.value).replace(/\s/g, "").replace(",", "."),
        );
        if (!isNaN(num)) {
          return num.toFixed(2);
        }
        return col.value;
      }

      if (!col?.inners || col.inners.length === 0) return "-";

      let sum = 0;
      let hasValue = false;

      for (const inner of col.inners) {
        if (
          inner?.value !== undefined &&
          inner?.value !== null &&
          inner?.value !== "-" &&
          inner?.value !== ""
        ) {
          const numStr = String(inner.value)
            .replace(/\s/g, "")
            .replace(",", ".");
          const num = parseFloat(numStr);
          if (!isNaN(num)) {
            sum += num;
            hasValue = true;
          }
        }
      }

      if (!hasValue) return "-";

      return sum.toFixed(2);
    };

    // 🔹 Yangi: Print uchun to'liq jadvalni olish
    const getPrintableTable = () => {
      if (!tableRef.current) return "";

      // Faqat jadvalni olish
      const table = tableRef.current.querySelector("table");
      if (!table) return "";

      // Jadvalni clone qilish va print uchun tayyorlash
      const clonedTable = table.cloneNode(true) as HTMLTableElement;

      // Barcha inline style va class larni saqlash
      const allElements = clonedTable.querySelectorAll("*");
      allElements.forEach((el) => {
        const originalEl = table.querySelector(
          `[data-print-id="${el.getAttribute("data-print-id")}"]`,
        );
        if (originalEl) {
          (el as HTMLElement).style.cssText = (
            originalEl as HTMLElement
          ).style.cssText;
        }
      });

      let html = clonedTable.outerHTML;

      // QR kodni qo'shish (agar mavjud bo'lsa)
      const qrCodeContainer = tableRef.current.querySelector(".mt-8");
      if (qrCodeContainer) {
        const qrClone = qrCodeContainer.cloneNode(true) as HTMLElement;
        qrClone.style.marginTop = "30px";
        qrClone.style.display = "flex";
        qrClone.style.alignItems = "center";
        qrClone.style.gap = "16px";
        html += qrClone.outerHTML;
      }

      return html;
    };

    // 🔹 Metrik ustunlar (Tashkilot nomi va O'simlik nomi faqat eng birinchi ustunlar sifatida chiqariladi, ichki ustunlardan tozalanadi)
    const filterMetricColumns = (items: any[]): any[] => {
      if (!items || !Array.isArray(items)) return [];
      return items
        .filter((item: any) => !isOrganizationColumn(item) && !isPlantColumn(item))
        .map((item: any) => ({
          ...item,
          children: item.children ? filterMetricColumns(item.children) : [],
        }));
    };

    const metricColumns = filterMetricColumns(data || []);

    const getMaxDepth = (items: any[]): number => {
      if (!items || items.length === 0) return 1;
      return items.reduce((max: number, item: any) => {
        if (item.children && item.children.length > 0) {
          return Math.max(max, 1 + getMaxDepth(item.children));
        }
        return Math.max(max, 1);
      }, 1);
    };

    const maxDepth = Math.max(1, getMaxDepth(metricColumns));

    const getColSpan = (item: any): number => {
      if (!item.children || item.children.length === 0) return 1;
      return item.children.reduce(
        (sum: number, child: any) => sum + getColSpan(child),
        0,
      );
    };

    const renderHeaderRows = () => {
      const rows: any[] = [];

      const traverse = (items: any[], depth: number, rowIndex: number) => {
        if (!rows[rowIndex]) rows[rowIndex] = [];

        items.forEach((item: any) => {
          const hasChildren = item.children && item.children.length > 0;

          rows[rowIndex].push({
            title: item.title ?? item.statement_column_name ?? "",
            colSpan: hasChildren ? getColSpan(item) : 1,
            rowSpan: hasChildren ? 1 : maxDepth - depth + 1,
          });

          if (hasChildren) {
            traverse(item.children, depth + 1, rowIndex + 1);
          }
        });
      };

      traverse(metricColumns, 1, 0);

      if (!rows[0]) rows[0] = [];

      // Har doim 1-qator boshiga Tashkilot nomi va O'simlik nomi / Daromad manbalari ustunlarini qo'shamiz
      rows[0].unshift(
        {
          title: t("organization_name_header"),
          colSpan: 1,
          rowSpan: maxDepth,
          isOrg: true,
        },
        {
          title: isDaromad
            ? t("income_sources_header")
            : t("plant_name_header"),
          colSpan: 1,
          rowSpan: maxDepth,
          isPlant: true,
        },
      );

      return rows;
    };

    // 🔹 Yangi: Header qatorlarini olish
    const getHeaderRows = () => {
      const headerRows = renderHeaderRows();

      // Header ma'lumotlarini tekis massivga aylantiramiz
      const flatHeaders: string[][] = [];

      headerRows.forEach((row, rIdx) => {
        const flatRow: string[] = [];
        if (rIdx === 0) {
          flatRow.push("№");
        }
        row.forEach((cell: any) => {
          let title = cell.title;
          if (cell.isOrg) title = t("organization_name_header");
          else if (cell.isPlant)
            title = isDaromad
              ? t("income_sources_header")
              : t("plant_name_header");

          // Har bir cellni uning colspan miqdorida takrorlaymiz
          for (let i = 0; i < cell.colSpan; i++) {
            flatRow.push(title);
          }
        });
        flatHeaders.push(flatRow);
      });

      return flatHeaders;
    };

    useImperativeHandle(ref, () => ({
      getTable: () => tableRef.current?.innerHTML,
      getPrintableTable,
      getHeaderRows,
    }));

    const headerRows = renderHeaderRows();

    return (
      <>
        <div
          className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl transition-colors shadow-xs"
          ref={tableRef}
          id="printableTable"
        >
          <table className="w-full border-collapse text-xs">
            <thead className="w-full">
              {headerRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {rowIndex === 0 && (
                    <th
                      className="border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2 py-1.5 text-center font-bold"
                      rowSpan={maxDepth}
                    >
                      №
                    </th>
                  )}
                  {row.map((cell: any, cellIndex: number) => {
                    const titleLower = (cell.title || "").toLowerCase();
                    let displayTitle = cell.title;

                    if (
                      cell.isOrg ||
                      (titleLower.includes("tashkilot") &&
                        (titleLower.includes("nomi") ||
                          titleLower.includes("организаци") ||
                          titleLower.includes("ташкилот")))
                    ) {
                      displayTitle = t("organization_name_header");
                    } else if (
                      cell.isPlant ||
                      titleLower.includes("o'simlik") ||
                      titleLower.includes("osimlik") ||
                      titleLower.includes("o‘simlik") ||
                      titleLower.includes("o`simlik") ||
                      titleLower.includes("растени") ||
                      titleLower.includes("ўсимлик") ||
                      titleLower.includes("daromad") ||
                      titleLower.includes("доход") ||
                      titleLower.includes("manba") ||
                      titleLower.includes("источник")
                    ) {
                      displayTitle = isDaromad
                        ? t("income_sources_header")
                        : t("plant_name_header");
                    }

                    return (
                      <th
                        key={cellIndex}
                        className="border min-w-[180px] border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2 py-1.5 text-center font-bold"
                        colSpan={cell.colSpan}
                        rowSpan={cell.rowSpan}
                      >
                        {displayTitle}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row: any, rowIndex: number) => {
                const allInnerCounts = row.report_items.flatMap(
                  (reportItem: any) =>
                    reportItem.statement_columns.map(
                      (col: any) => col.inners?.length || 0,
                    ),
                );
                const maxInners = Math.max(0, ...allInnerCounts);
                const orgName =
                  row.organization_name ||
                  row.region_name ||
                  row.name ||
                  "";

                return (
                  <Fragment key={row.id}>
                    {/* Har bir inner o'simlik uchun qator (0..maxInners-1) */}
                    {Array.from({ length: maxInners }).map((_, innerIndex) => {
                      let plantName = "";
                      for (const rItem of row.report_items || []) {
                        for (const col of rItem.statement_columns || []) {
                          if (col.inners?.[innerIndex]?.plant_name) {
                            plantName = col.inners[innerIndex].plant_name;
                            break;
                          }
                        }
                        if (plantName) break;
                      }

                      return (
                        <tr
                          key={`inner-${innerIndex}`}
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                        >
                          {/* Birinchi qatorda № va Tashkilot nomi rowSpan=maxInners bilan chiqadi (faqat o'simlik qatorlari) */}
                          {innerIndex === 0 && (
                            <>
                              <td
                                className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold"
                                rowSpan={maxInners}
                              >
                                {rowIndex + 1}
                              </td>
                              <td
                                className="border min-w-[220px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold"
                                rowSpan={maxInners}
                              >
                                {orgName}
                              </td>
                            </>
                          )}

                          {/* O'simlik nomi ustuni */}
                          <td className="border min-w-[200px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-semibold">
                            {plantName || "-"}
                          </td>

                          {/* Qolgan qiymat ustunlari */}
                          {row.report_items?.map((reportItem: any) =>
                            reportItem.statement_columns?.map(
                              (col: any, colIdx: number) => {
                                if (isOrganizationColumn(col) || isPlantColumn(col)) {
                                  return null;
                                }
                                const inner = col.inners?.[innerIndex];
                                return (
                                  <td
                                    key={`inner-${col.id || col.statement_column_id || colIdx}-${innerIndex}`}
                                    className="border min-w-[120px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center"
                                  >
                                    {formatCellValue(inner?.value)}
                                  </td>
                                );
                              },
                            ),
                          )}
                        </tr>
                      );
                    })}

                    {/* 🔥 Oxirgi qator: Tashkilot Jami qatori (summa qiymatlari bilan) */}
                    <tr className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/80 font-bold bg-slate-100/70 dark:bg-slate-800/90 transition-colors">
                      {/* № ustuni */}
                      <td className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold">
                        {rowIndex + 1}
                      </td>
                      {/* Tashkilot nomi ustunida "Tashkilot Jami" yozuvi */}
                      <td className="border min-w-[220px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold">
                        {t("organization_total")}
                      </td>
                      {/* O'simlik nomi ustuni bo'sh qolsin */}
                      <td className="border min-w-[200px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center">
                      </td>
                      {row.report_items?.map((reportItem: any) =>
                        reportItem.statement_columns?.map(
                          (col: any, colIdx: number) => {
                            if (isOrganizationColumn(col) || isPlantColumn(col)) {
                              return null;
                            }
                            return (
                              <td
                                key={`tot-${col.id || col.statement_column_id || colIdx}`}
                                className="border min-w-[120px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold"
                              >
                                {calculateColumnTotal(col)}
                              </td>
                            );
                          },
                        ),
                      )}
                    </tr>

                    {/* 🔥 Children rows */}
                    {row.children_reports?.length > 0 &&
                      row.children_reports.map(
                        (child: any, childIndex: number) => {
                          const childAllInnerCounts = child.report_items.flatMap(
                            (reportItem: any) =>
                              reportItem.statement_columns.map(
                                (col: any) => col.inners?.length || 0,
                              ),
                          );
                          const childMaxInners = Math.max(0, ...childAllInnerCounts);
                          const childOrgName =
                            child.organization_name ||
                            child.region_name ||
                            child.name ||
                            "";

                          return (
                            <Fragment key={child.id || childIndex}>
                              {Array.from({ length: childMaxInners }).map(
                                (_, innerIndex) => {
                                  let childPlantName = "";
                                  for (const rItem of child.report_items || []) {
                                    for (const col of rItem.statement_columns || []) {
                                      if (col.inners?.[innerIndex]?.plant_name) {
                                        childPlantName = col.inners[innerIndex].plant_name;
                                        break;
                                      }
                                    }
                                    if (childPlantName) break;
                                  }

                                  return (
                                    <tr
                                      key={`child-inner-${innerIndex}`}
                                      onClick={() => onRowClick(child)}
                                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                                    >
                                      {innerIndex === 0 && (
                                        <>
                                          <td
                                            className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-semibold"
                                            rowSpan={childMaxInners}
                                          >
                                            {rowIndex + 1}.{childIndex + 1}
                                          </td>
                                          <td
                                            className="border min-w-[220px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-semibold"
                                            rowSpan={childMaxInners}
                                          >
                                            {childOrgName}
                                          </td>
                                        </>
                                      )}

                                      <td className="border min-w-[200px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-semibold">
                                        {childPlantName || "-"}
                                      </td>

                                      {child.report_items?.map(
                                        (reportItem: any) =>
                                          reportItem.statement_columns?.map(
                                            (col: any, colIdx: number) => {
                                              if (isOrganizationColumn(col) || isPlantColumn(col)) {
                                                return null;
                                              }
                                              const inner = col.inners?.[innerIndex];
                                              return (
                                                <td
                                                  key={`cinner-${col.id || col.statement_column_id || colIdx}-${innerIndex}`}
                                                  className="border min-w-[120px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center"
                                                >
                                                  {formatCellValue(inner?.value)}
                                                </td>
                                              );
                                            },
                                          ),
                                      )}
                                    </tr>
                                  );
                                },
                              )}

                              {/* Child Tashkilot Jami qatori */}
                              <tr
                                onClick={() => onRowClick(child)}
                                className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/80 font-bold bg-slate-100/70 dark:bg-slate-800/90 transition-colors"
                              >
                                {/* № ustuni */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold">
                                  {rowIndex + 1}.{childIndex + 1}
                                </td>
                                {/* Tashkilot nomi ustunida "Tashkilot Jami" yozuvi */}
                                <td className="border min-w-[220px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold">
                                  {t("organization_total")}
                                </td>
                                {/* O'simlik nomi ustuni bo'sh qolsin */}
                                <td className="border min-w-[200px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center">
                                </td>
                                {child.report_items?.map(
                                  (reportItem: any) =>
                                    reportItem.statement_columns?.map(
                                      (col: any, colIdx: number) => {
                                        if (isOrganizationColumn(col) || isPlantColumn(col)) {
                                          return null;
                                        }
                                        return (
                                          <td
                                            key={`ctot-${col.id || col.statement_column_id || colIdx}`}
                                            className="border min-w-[120px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold"
                                          >
                                            {calculateColumnTotal(col)}
                                          </td>
                                        );
                                      },
                                    ),
                                )}
                              </tr>
                            </Fragment>
                          );
                        },
                      )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs backdrop-blur-md transition-colors mt-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div>
              <Input
                type="text"
                placeholder={`${t("item_79")}...`}
                className="w-[220px] text-xs sm:text-sm h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:!bg-slate-800 text-slate-800 dark:!text-slate-100 shadow-none focus:ring-1 focus:ring-blue-500"
                value={searchTermReport}
                onChange={(e: any) => setSearchTermReport(e.target.value)}
              />
            </div>

            <div>
              <Select
                value={selectedOrganizationReport}
                onValueChange={(value) => setSelectedOrganizationReport(value)}
              >
                <SelectTrigger className="w-[220px] text-xs sm:text-sm h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-none">
                  <SelectValue placeholder={t("region")} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  {regions2.map((region) => {
                    return (
                      <SelectItem key={region.value} value={region.value} className="dark:text-slate-100">
                        {region.value}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={selectedStatusReport}
                onValueChange={(value) => setSelectedStatusReport(value)}
              >
                <SelectTrigger className="w-[180px] text-xs sm:text-sm h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-none">
                  <SelectValue placeholder={t("item_28")} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  {statuses.map((status) => (
                    <SelectItem key={status.value} value={status.value} className="dark:text-slate-100">
                      {i18n.language === "uz"
                        ? status.label_uz
                        : status.label_ru}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button
                onClick={() => {
                  setSelectedOrganizationReport("");
                  setSelectedPeriodReport("");
                  setSelectedStatusReport("");
                  setSearchTermReport("");
                }}
                className="h-[40px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95"
              >
                {t("reset")}
              </Button>
            </div>
          </div>

          <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-slate-100/90 dark:bg-slate-800/90 h-[44px] border-b border-slate-200 dark:border-slate-700">
                  <TableHead className="w-[35%] pl-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-left border-none">
                    {t("item_12")}
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-200 text-left text-xs font-bold uppercase tracking-wider w-[20%] border-none">
                    {t("item_83")}
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-200 text-left text-xs font-bold uppercase tracking-wider w-[15%] border-none">
                    {t("item_14")}
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-200 text-left text-xs font-bold uppercase tracking-wider w-[15%] border-none">
                    {t("item_15")}
                  </TableHead>
                  <TableHead className="text-right pr-3 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider w-[15%] border-none">
                    {t("item_16")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {allReports?.results?.map((item: any) => (
                  <TableRow
                    key={item.id}
                    className={`h-[46px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${selectedRow?.id === item.id ? "bg-blue-50/50 dark:bg-slate-800" : ""
                      }`}
                    onClick={() =>
                      onRowClick?.(selectedRow?.id === item.id ? null : item)
                    }
                  >
                    <TableCell className="w-[35%] pl-3 text-xs font-semibold text-slate-800 dark:text-slate-100 border-none whitespace-normal break-words leading-snug">
                      {i18n.language === "ru" &&
                      (item?.organization_name === "O'rmon xo'jaligini raqamlashtirish markazi davlat muassasasi" ||
                        !item?.organization_name)
                        ? t("compny_name")
                        : item?.organization_name}
                    </TableCell>
                    <TableCell className="w-[20%] text-xs font-medium text-slate-700 dark:text-slate-200 border-none whitespace-normal break-words">
                      {item?.statement_name}
                    </TableCell>
                    <TableCell className="w-[15%] text-xs font-medium text-slate-600 dark:text-slate-300 border-none">
                      {i18n.language === "ru" && typeof item?.submit_at === "string"
                        ? item.submit_at.replace("CHORAK", "КВАРТАЛ")
                        : item?.submit_at}
                    </TableCell>
                    <TableCell className="w-[15%] text-xs font-medium text-slate-600 dark:text-slate-300 border-none">
                      {[
                        item?.accepted_at,
                        item?.cancelled_at,
                        item?.sent_at,
                        item?.created_at,
                      ].find((v) => v != null && v !== "")}
                    </TableCell>
                    <TableCell className="text-right pr-3 text-xs font-medium border-none">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold inline-block whitespace-nowrap border ${item.status === "accepted"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
                          : item.status === "cancelled"
                            ? "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800/60"
                            : item.status == "saved"
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                              : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                          }`}
                      >
                        {item?.status == "accepted"
                          ? t("received")
                          : item.status == "cancelled"
                            ? t("returned")
                            : item.status == "saved"
                              ? t("draft")
                              : t("sended")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Detal ko'rinish */}
        {selectedRow && (
          <div ref={detailRef} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
            <div className="flex items-center justify-between my-5 flex-wrap gap-4">
              <div className="flex gap-2 flex-col">
                {selectedRow.status === "cancelled" && (
                  <span className="text-xl flex items-center gap-2 font-[500] text-red-600 dark:text-red-400">
                    <MessageSquareWarning size={32} />{" "}
                    Qaytarilish sababi:{" "}
                    <span className="font-bold">
                      {selectedRow?.cancel_reason || "Noma'lum"}
                    </span>
                  </span>
                )}
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <span className="flex text-lg sm:text-xl items-center gap-2 font-semibold">
                    <NotebookText size={24} /> {t("deadline")}:
                  </span>
                  <span className="text-lg sm:text-xl font-bold">{selectedRow.submit_at}</span>
                </div>
                <div className="text-sm sm:text-base text-slate-800 dark:text-slate-100">
                  <b className="font-bold">{t("item_12")}:</b>{" "}
                  {selectedRow.organization_name}
                </div>
                {selectedRow.foot_note && (
                  <div className="text-sm sm:text-base mt-2 text-slate-700 dark:text-slate-300">
                    <b className="font-bold">Izoh:</b> {selectedRow.foot_note}
                  </div>
                )}
                {selectedRow?.export_info && (
                  <div className="text-sm sm:text-base mt-2 text-slate-700 dark:text-slate-300">
                    <b className="font-bold">Eksport ma'lumotlari:</b>{" "}
                    {selectedRow.export_info}
                  </div>
                )}

                {detailQuarter != null && (
                  <div className="w-full mt-4 flex items-center gap-4 bg-blue-50/80 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 p-4 rounded-2xl shadow-xs transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                      <Clock size={22} />
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        Hozirgi faol chorak
                      </p>
                      <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                        {String(detailQuarter).match(/\d/) ? `${String(detailQuarter).match(/\d/)?.[0]}-chorak` : detailQuarter}
                      </p>
                    </div>
                  </div>
                )}

                {selectedRow?.statement_name == "Daromad" &&
                  detailQuarterInfo && (
                    <div className="w-full mt-6">
                      <b className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 block">Choraklar holati:</b>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { id: 1, status: detailQuarterInfo?.quarter_1_status },
                          { id: 2, status: detailQuarterInfo?.quarter_2_status },
                          { id: 3, status: detailQuarterInfo?.quarter_3_status },
                          { id: 4, status: detailQuarterInfo?.quarter_4_status },
                        ].map((quarter) => {
                          const config = getQuarterStatusConfig(String(quarter.status || ""));
                          const Icon = config.Icon;
                          return (
                            <div
                              key={quarter.id}
                              className={`flex flex-col p-4 rounded-2xl border transition-all duration-200 ease-in-out hover:-translate-y-0.5 ${config.color}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider">{quarter.id}-chorak</span>
                                <Icon size={18} className="opacity-90" />
                              </div>
                              <div className="text-sm font-bold flex-1 flex items-end">
                                {config.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {detailQuarterInfo === undefined &&
                  selectedRow?.statement_name == "Daromad" && (
                    <div className="text-sm mt-4 w-full p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-800 dark:text-amber-300 flex flex-row items-center gap-2">
                      <MessageSquareWarning size={20} />
                      <span>quarter_info ma'lumoti topilmadi.</span>
                    </div>
                  )}
              </div>
              <div>
                <div className="flex justify-end items-center gap-2.5 mb-3 flex-wrap">
                  {/* 🔹 Qaytarish (Recycle) button */}
                  {(user_role === "tashkilot_rahbari" ||
                    user_role === "bolim_admin" ||
                    user_role === "super_admin") &&
                    effectiveStatus !== "accepted" &&
                    (effectiveStatus == "saved" ||
                      effectiveStatus == "cancelled" ||
                      effectiveStatus == "sent") && (
                      <Button
                        onClick={() => setIsCancelModalOpen(true)}
                        className="h-[40px] px-4 font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95"
                      >
                        {t("recycle")}
                      </Button>
                    )}

                  {/* 🔹 Yuborish — faqat tashkilot rahbari, E-imzo imzosi bilan */}
                  {user_role === "tashkilot_rahbari" && effectiveStatus == "saved" && (
                    <SignAndSendDialog reportId={selectedRow.id} />
                  )}

                  {/* 🔹 Qabul qilish (Accept) button - faqat bolim_admin va sent status'da */}
                  {(user_role === "bolim_admin" ||
                    user_role === "super_admin") &&
                    effectiveStatus == "sent" && (
                      <Button
                        onClick={async () => {
                          if (!selectedRow?.id) {
                            alert("Hisobot ID topilmadi");
                            return;
                          }

                          try {
                            await acceptReport({
                              id: selectedRow.id,
                            }).unwrap();

                            // Qabul qilingan hisobotlarni ro'yxatga qo'shish
                            setAcceptedReports((prev: any) => {
                              const newSet = new Set(prev);
                              newSet.add(selectedRow.id);
                              return newSet;
                            });

                            alert("Hisobot muvaffaqiyatli qabul qilindi!");
                          } catch (error: any) {
                            const isForbidden =
                              error?.status === 403 ||
                              error?.originalStatus === 403 ||
                              error?.status === 401;
                            const msg = isForbidden
                              ? "Buyruq bajarish uchun sizda ruxsat yo'q"
                              : error?.data?.detail ||
                                error?.data?.message ||
                                "Qabul qilishda xatolik yuz berdi";
                            alert(msg);
                          }
                        }}
                        disabled={
                          isAccepting || acceptedReports.has(selectedRow.id)
                        }
                        className="h-[40px] px-4 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95"
                      >
                        {isAccepting
                          ? "Qabul qilinmoqda..."
                          : acceptedReports.has(selectedRow.id)
                            ? "Qabul qilindi"
                            : "Qabul qilish"}
                      </Button>
                    )}

                  {/* 🔹 Export button - har doim ko'rinadi */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="h-[40px] px-4 font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95">
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 mt-2 mr-2">
                      <DropdownMenuItem
                        onClick={handleExportExcel}
                        disabled={!selectedRow?.id || isExporting}
                      >
                        {isExporting
                          ? "Export qilinmoqda..."
                          : "Hisobotni export qilib olish"}
                      </DropdownMenuItem>

                      <DropdownMenuItem>Hisobotni chop etish</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            <div className="mt-6 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-xs">
              <table className="w-full border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold">
                  {headerRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {rowIndex === 0 && (
                        <th
                          rowSpan={maxDepth}
                          className="border border-slate-300 dark:border-slate-700 px-2 py-2 text-center"
                        >
                          №
                        </th>
                      )}
                      {row.map((cell: any, cellIndex: number) => {
                        const titleLower = (cell.title || "").toLowerCase();
                        let displayTitle = cell.title;

                        if (
                          cell.isOrg ||
                          (titleLower.includes("tashkilot") &&
                            (titleLower.includes("nomi") ||
                              titleLower.includes("организаци") ||
                              titleLower.includes("ташкилот")))
                        ) {
                          displayTitle = t("organization_name_header");
                        } else if (
                          cell.isPlant ||
                          titleLower.includes("o'simlik") ||
                          titleLower.includes("osimlik") ||
                          titleLower.includes("o‘simlik") ||
                          titleLower.includes("o`simlik") ||
                          titleLower.includes("растени") ||
                          titleLower.includes("ўсимлик") ||
                          titleLower.includes("daromad") ||
                          titleLower.includes("доход") ||
                          titleLower.includes("manba") ||
                          titleLower.includes("источник")
                        ) {
                          displayTitle = isDaromad
                            ? t("income_sources_header")
                            : t("plant_name_header");
                        }

                        return (
                          <th
                            key={cellIndex}
                            className="border min-w-[180px] border-slate-300 dark:border-slate-700 px-2 py-2 text-center font-bold"
                            colSpan={cell.colSpan}
                            rowSpan={cell.rowSpan}
                          >
                            {displayTitle}
                          </th>
                        );
                      })}
                      {rowIndex === 0 && (
                        <th
                          rowSpan={maxDepth}
                          className="border border-slate-300 dark:border-slate-700 px-2 py-2 text-center"
                        >
                          Amallar
                        </th>
                      )}
                    </tr>
                  ))}
                </thead>
                <tbody className="text-xs text-slate-800 dark:text-slate-100">
                  {/* 🌱 Plant Detail - PlantTableColumn har doim plant detail ko'rsatadi */}
                  {isPlantStatement && (
                    <>
                      {isPlantDetailLoading ? (
                        <tr>
                          <td
                            className="border border-slate-300 dark:border-slate-700 px-2 py-3 text-center"
                            colSpan={999}
                          >
                            Yuklanmoqda...
                          </td>
                        </tr>
                      ) : (
                        normalizedPlantReportItems.map(
                          (reportItem: any, reportIndex: number) => {
                            const maxInners = Math.max(
                              1,
                              ...reportItem.statement_columns.map(
                                (col: any) => col.inners?.length || 0,
                              ),
                            );

                            const orgName =
                              reportItem.organization_name ||
                              reportItem.region_name ||
                              selectedRow?.organization_name ||
                              selectedRow?.region_name ||
                              selectedRow?.name ||
                              "-";

                            const rowsToRender = Array.from({
                              length: maxInners,
                            }).map((_, innerIndex) => {
                              const columns =
                                reportItem.statement_columns?.map(
                                  (col: any) => ({
                                    col: col,
                                    inner: col.inners?.[innerIndex] || null,
                                    innerIndex: innerIndex,
                                  }),
                                ) || [];

                              let plantName = "";
                              for (const colData of columns) {
                                if (colData.inner?.plant_name) {
                                  plantName = colData.inner.plant_name;
                                  break;
                                }
                              }

                              return {
                                plantName: plantName,
                                columns: columns,
                                innerIndex: innerIndex,
                              };
                            });

                            const finalRows = rowsToRender.filter((row) => {
                              return row.columns.some(
                                (colData: any) =>
                                  colData.inner !== null &&
                                  colData.inner !== undefined,
                              );
                            });

                            return (
                              <Fragment key={`plant-${reportIndex}`}>
                                {finalRows.map((rowData, rowIdx) => {
                                  return (
                                    <tr key={`plant-${reportIndex}-${rowIdx}`} className="hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
                                      {/* T/R */}
                                      {rowIdx === 0 && (
                                        <td
                                          className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold"
                                          rowSpan={finalRows.length}
                                        >
                                          {reportIndex + 1}
                                        </td>
                                      )}

                                      {/* Tashkilot nomi ustuni */}
                                      {rowIdx === 0 && (
                                        <td
                                          className="border min-w-[220px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold"
                                          rowSpan={finalRows.length}
                                        >
                                          {orgName}
                                        </td>
                                      )}

                                      {/* O'simlik nomi ustuni */}
                                      <td className="border min-w-[200px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-semibold">
                                        {rowData.plantName || "-"}
                                      </td>

                                      {/* Qiymat ustunlari */}
                                      {reportItem.statement_columns?.map(
                                        (col: any) => {
                                          if (isOrganizationColumn(col) || isPlantColumn(col)) {
                                            return null;
                                          }
                                          const colData = rowData.columns.find(
                                            (c: any) =>
                                              (c.col.statement_column_id ||
                                                c.col.id) ===
                                              (col.statement_column_id ||
                                                col.id),
                                          );
                                          const inner = colData?.inner || null;

                                          return (
                                            <td
                                              key={
                                                col.statement_column_id ||
                                                col.id
                                              }
                                              className="border min-w-[120px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center"
                                            >
                                              {formatInnerValue(inner)}
                                            </td>
                                          );
                                        },
                                      )}

                                      {/* Amallar ustuni */}
                                      {rowIdx === 0 && (
                                        <td
                                          className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center"
                                          rowSpan={finalRows.length}
                                        >
                                          {(selectedRow.status == "saved" ||
                                            selectedRow.status == "cancelled" ||
                                            (selectedRow.status == "accepted" &&
                                              reportName == "Daromad")) &&
                                          user_role == "tashkilot_hodimi" ? (
                                            <div className="flex items-center justify-center gap-2">
                                              <Button
                                                className="bg-blue-600 hover:bg-blue-700 rounded-lg p-2 h-8 w-8 text-white shadow-xs"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate(
                                                    `/resource-management/update/${selectedRow?.id}/${reportName}`,
                                                  );
                                                }}
                                              >
                                                <Edit2 size={16} />
                                              </Button>
                                              {selectedRow.status ==
                                                "saved" && (
                                                <Button
                                                  className="bg-red-600 hover:bg-red-700 rounded-lg p-2 h-8 w-8 text-white shadow-xs"
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                      await deleteReport(
                                                        selectedRow.id,
                                                      ).unwrap();
                                                      window.location.reload();
                                                    } catch (error) {
                                                      console.error(
                                                        "Delete error:",
                                                        error,
                                                      );
                                                    }
                                                  }}
                                                >
                                                  <Trash2 size={16} />
                                                </Button>
                                              )}
                                            </div>
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}

                                {/* 🔥 Tashkilot Jami qatori */}
                                <tr className="font-bold bg-slate-100/70 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors">
                                  {/* № */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold">
                                    {reportIndex + 1}
                                  </td>
                                  {/* Tashkilot nomi */}
                                  <td className="border min-w-[220px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold">
                                    {t("organization_total")}
                                  </td>
                                  {/* O'simlik nomi - bo'sh */}
                                  <td className="border min-w-[200px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center">
                                  </td>
                                  {/* Qiymat ustunlari - jami */}
                                  {reportItem.statement_columns?.map(
                                    (col: any) => {
                                      if (isOrganizationColumn(col) || isPlantColumn(col)) {
                                        return null;
                                      }
                                      return (
                                        <td
                                          key={`dtot-${col.statement_column_id || col.id}`}
                                          className="border min-w-[120px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold"
                                        >
                                          {calculateColumnTotal(col)}
                                        </td>
                                      );
                                    },
                                  )}
                                  {/* Amallar - bo'sh */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center">
                                  </td>
                                </tr>
                              </Fragment>
                            );
                          },
                        )
                      )}
                    </>
                  )}



                </tbody>
              </table>

              {/* E-imzo imzosi + QR (tekshirish sahifasiga havola), printda ham chiqadi */}
                <SignatureBadge
                  signature={selectedRow.signature}
                  fallbackName={selectedRow.sent_by_full_name}
                  orgName={selectedRow.sent_by_org_name}
                />
            </div>
            <CancelReportModal
              open={isCancelModalOpen}
              setOpen={setIsCancelModalOpen}
              reportId={selectedRow?.id}
            />
          </div>
        )}
      </>
    );
  },
);

export default PlantTableColumn;
