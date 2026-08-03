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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base_url } from "@/services/baseUrl";
import {
  useAcceptReportMutation,
  useDeleteReportMutation,
  useSendReportMutation,
  useExportExcelMutation,
} from "@/services/reportsApi";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { decryptData } from "@/utils/crypto";
import CancelReportModal from "@/components/Modals/CancelReportModal";
import QRCodeGenerator from "@/components/QRCodeGenerator";
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

const TableColumn = forwardRef(
  (
    {
      data = [],
      rows = [],
      onRowClick,
      selectedRow,
      allReports,
      individualRows = [],
      setSelectedOrganizationReport,
      setSelectedPeriodReport,
      setSelectedStatusReport,
      setSearchTermReport,
      selectedOrganizationReport,
      selectedStatusReport,
      searchTermReport,
      reportName,
    }: any,
    ref,
  ) => {
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
    const [sendReport, { isLoading: isSending }] = useSendReportMutation();
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

    // 🔹 Yangi: Header qatorlarini olish
    const getHeaderRows = () => {
      const headerRows = renderHeaderRows();

      // Header ma'lumotlarini tekis massivga aylantiramiz
      const flatHeaders: string[][] = [];

      headerRows.forEach((row) => {
        const flatRow: string[] = [];
        row.forEach((cell: any) => {
          // Har bir cellni uning colspan miqdorida takrorlaymiz
          for (let i = 0; i < cell.colSpan; i++) {
            flatRow.push(cell.title);
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

    const getMaxDepth = (items: any[]): number => {
      return items.reduce((max: number, item: any) => {
        if (item.children && item.children.length > 0) {
          return Math.max(max, 1 + getMaxDepth(item.children));
        }
        return Math.max(max, 1);
      }, 0);
    };

    const maxDepth = getMaxDepth(data);

    const renderHeaderRows = () => {
      const rows: any[] = [];

      const traverse = (items: any[], depth: number, rowIndex: number) => {
        if (!rows[rowIndex]) rows[rowIndex] = [];

        items.forEach((item: any) => {
          const hasChildren = item.children && item.children.length > 0;

          rows[rowIndex].push({
            title: item.title,
            colSpan: hasChildren ? getColSpan(item) : 1,
            rowSpan: hasChildren ? 1 : maxDepth - depth + 1,
          });

          if (hasChildren) {
            traverse(item.children, depth + 1, rowIndex + 1);
          }
        });
      };

      traverse(data, 1, 0);

      return rows;
    };

    const getColSpan = (item: any): number => {
      if (!item.children || item.children.length === 0) return 1;
      return item.children.reduce(
        (sum: number, child: any) => sum + getColSpan(child),
        0,
      );
    };

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

                    if (titleLower.includes("tashkilot") && titleLower.includes("nomi")) {
                      displayTitle = t("organization_name_header");
                    } else if (titleLower.includes("o'simlik") || titleLower.includes("osimlik")) {
                      displayTitle = t("plant_name_header");
                    }

                    return (
                      <th
                        key={cellIndex}
                        className="border min-w-[150px] border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2 py-1.5 text-center font-bold"
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
              {rows?.map((row: any, rowIndex: number) => {
                const maxInners = Math.max(
                  ...row.report_items.map((reportItem: any) =>
                    Math.max(
                      ...reportItem.statement_columns.map(
                        (col: any) => col.inners?.length || 0,
                      ),
                    ),
                  ),
                );

                return (
                  <Fragment key={row.id}>
                    {/* 🔹 Parent row */}
                    {Array.from({ length: maxInners }).map((_, innerIndex) => (
                      <tr
                        key={innerIndex}
                        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                      >
                        {/* TR faqat birinchi qatorda chiqadi */}
                        {innerIndex === 0 && (
                          <td
                            className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center"
                            rowSpan={maxInners}
                          >
                            {rowIndex + 1}
                          </td>
                        )}

                        {row.report_items?.map((reportItem: any) =>
                          reportItem.statement_columns?.map((col: any) => (
                            <td
                              key={col.id}
                              className="border min-w-[380px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-bold"
                            >
                              {col.inners?.[innerIndex]?.value || ""}
                            </td>
                          )),
                        )}
                      </tr>
                    ))}

                    {/* 🔥 Children rows */}
                    {row.children_reports?.length > 0 &&
                      row.children_reports.map(
                        (child: any, childIndex: number) => {
                          const childMaxInners = Math.max(
                            ...child.report_items.map((reportItem: any) =>
                              Math.max(
                                ...reportItem.statement_columns.map(
                                  (col: any) => col.inners?.length || 0,
                                ),
                              ),
                            ),
                          );

                          return (
                            <Fragment key={child.id || childIndex}>
                              {Array.from({ length: childMaxInners }).map(
                                (_, innerIndex) => (
                                  <tr
                                    key={innerIndex}
                                    onClick={() => onRowClick(child)}
                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                                  >
                                    {/* Child TR faqat birinchi qatorda chiqadi */}
                                    {innerIndex === 0 && (
                                      <td
                                        className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center"
                                        rowSpan={childMaxInners}
                                      >
                                        {rowIndex + 1}.{childIndex + 1}
                                      </td>
                                    )}

                                    {child.report_items?.map(
                                      (reportItem: any) =>
                                        reportItem.statement_columns?.map(
                                          (col: any) => (
                                            <td
                                              key={col.id}
                                              className="border min-w-[380px] border-slate-300 dark:border-slate-700 px-2 py-1 text-center"
                                            >
                                              {col.inners?.[innerIndex]
                                                ?.value || ""}
                                            </td>
                                          ),
                                        ),
                                    )}
                                  </tr>
                                ),
                              )}
                            </Fragment>
                          );
                        },
                      )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
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
                    className={`h-[46px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                      selectedRow?.id === item.id ? "bg-blue-50/50 dark:bg-slate-800" : ""
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
                        className={`px-3 py-1 rounded-full text-xs font-semibold inline-block whitespace-nowrap border ${
                          item.status === "accepted"
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
        </div>        </div>

        {/* Detal ko'rinish */}
        {selectedRow && (() => {
          const detailQuarterInfo = selectedRow?.quarter_info;
          const detailQuarter = selectedRow?.quarter;
          const currentQuarterNum = String(detailQuarter || "").match(/\d/)?.[0];
          const activeQuarterStatus =
            selectedRow?.statement_name === "Daromad" && currentQuarterNum && detailQuarterInfo
              ? detailQuarterInfo[`quarter_${currentQuarterNum}_status`]
              : null;
          const effectiveStatus = activeQuarterStatus || selectedRow?.status;

          return (
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

                    {/* 🔹 Yuborish (Send) button */}
                    {(user_role === "tashkilot_rahbari" ||
                      user_role === "super_admin") &&
                      effectiveStatus !== "accepted" &&
                      (effectiveStatus == "saved" ||
                        effectiveStatus == "cancelled") && (
                        <Button
                          onClick={async () => {
                            if (!selectedRow?.id) {
                              alert("Hisobot ID topilmadi");
                              return;
                            }

                            try {
                              await sendReport({
                                id: selectedRow.id,
                              }).unwrap();
                              alert("Hisobot muvaffaqiyatli yuborildi!");
                            } catch (error: any) {
                              console.error("sendReport error:", error);
                              const isForbidden =
                                error?.status === 403 ||
                                error?.originalStatus === 403 ||
                                error?.status === 401;
                              const msg = isForbidden
                                ? "Buyruq bajarish uchun sizda ruxsat yo'q"
                                : error?.data?.detail ||
                                  error?.data?.message ||
                                  (typeof error?.data === "string"
                                    ? error.data
                                    : null) ||
                                  "Hisobot yuborishda xatolik yuz berdi";
                              alert(msg);
                            }
                          }}
                          disabled={isSending}
                          className="h-[40px] px-4 font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95"
                        >
                          {isSending ? t("sending") : t("send2")}
                        </Button>
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
                <thead>
                  {headerRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {rowIndex === 0 && (
                        <th
                          rowSpan={maxDepth}
                          className="border border-black px-2 py-1 text-center"
                        >
                          №
                        </th>
                      )}
                      {row.map((cell: any, cellIndex: number) => {
                        return (
                          <th
                            key={cellIndex}
                            className="border w-[400px] border-black px-2 py-1 text-center"
                            colSpan={cell.colSpan}
                            rowSpan={cell.rowSpan}
                          >
                            {cell.title}
                          </th>
                        );
                      })}
                      {rowIndex === 0 && (
                        <th
                          rowSpan={maxDepth}
                          className="border border-black px-2 py-1 text-center"
                        >
                          Amallar
                        </th>
                      )}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {/* 🔹 Selected Row (jami) */}
                  {selectedRow.report_items?.map(
                    (reportItem: any, reportIndex: number) => {
                      const maxInners = Math.max(
                        ...reportItem.statement_columns.map(
                          (col: any) => col.inners?.length || 0,
                        ),
                      );

                      return (
                        <Fragment key={reportIndex}>
                          {Array.from({ length: maxInners }).map(
                            (_, innerIndex) => (
                              <tr key={innerIndex}>
                                {/* T/R faqat birinchi qatorda chiqsin */}
                                {innerIndex === 0 && (
                                  <td
                                    className="border border-black px-2 py-1 text-center"
                                    rowSpan={maxInners}
                                  >
                                    1
                                  </td>
                                )}

                                {reportItem.statement_columns?.map(
                                  (col: any) => (
                                    <td
                                      key={col.id}
                                      className="border min-w-[350px] border-black px-2 py-1 text-center"
                                    >
                                      {col.inners?.[innerIndex]?.value || ""}
                                    </td>
                                  ),
                                )}

                                {/* Amallar faqat birinchi qatorda chiqsin */}
                                {innerIndex === 0 &&
                                  (selectedRow.status == "saved" ||
                                    selectedRow.status == "cancelled") &&
                                  user_role == "tashkilot_hodimi" && (
                                    <td
                                      className="border border-black px-2 py-1 text-center"
                                      rowSpan={maxInners}
                                    >
                                      <div className="flex items-center justify-center gap-2">
                                        <Button
                                          className="bg-[#3B82F6] hover:bg-[#2563EB]"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(
                                              `/resource-management/update/${selectedRow?.id}/${reportName}`,
                                            );
                                          }}
                                        >
                                          <Edit2 />
                                        </Button>
                                        {selectedRow.status == "saved" && (
                                          <Button
                                            className="bg-[#3B82F6] hover:bg-[#2563EB]"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              try {
                                                await deleteReport(
                                                  selectedRow.id,
                                                ).unwrap();
                                                // Mutasyon muvaffaqiyatli bo'lgandan keyin sahifani yangilash
                                                window.location.reload();
                                              } catch (error) {
                                                console.error(
                                                  "Delete error:",
                                                  error,
                                                );
                                              }
                                            }}
                                          >
                                            <Trash2 />
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                              </tr>
                            ),
                          )}
                        </Fragment>
                      );
                    },
                  )}

                  {/* 🔥 Individual Rows (Jami) */}
                  {individualRows?.length > 0 &&
                    individualRows.map((indRow: any) =>
                      indRow.report_items?.map(
                        (reportItem: any, reportIndex: number) => {
                          const maxInners = Math.max(
                            ...reportItem.statement_columns.map(
                              (col: any) => col.inners?.length || 0,
                            ),
                          );

                          return (
                            <Fragment key={reportIndex}>
                              {Array.from({ length: maxInners }).map(
                                (_, innerIndex) => (
                                  <tr key={innerIndex}>
                                    {/* T/R bo'ish, faqat birinchi qatorda chiqsin */}
                                    {innerIndex === 0 && (
                                      <td
                                        className="border border-black px-2 py-1 text-center"
                                        rowSpan={maxInners}
                                      >
                                        {innerIndex + 1}
                                      </td>
                                    )}

                                    {reportItem.statement_columns?.map(
                                      (col: any) => (
                                        <td
                                          key={col.id}
                                          className="border min-w-[120px] border-black px-2 py-1 text-center"
                                        >
                                          {col.inners?.[innerIndex]?.value ||
                                            ""}
                                        </td>
                                      ),
                                    )}

                                    {/* Amallar faqat birinchi qatorda chiqsin */}
                                    <td className="flex items-center justify-center">
                                      -
                                    </td>
                                  </tr>
                                ),
                              )}
                            </Fragment>
                          );
                        },
                      ),
                    )}
                </tbody>
              </table>

              {/* QR Code pastga qo'shiladi (printda ham chiqadi) */}
              {selectedRow.sent_by_full_name &&
                selectedRow.sent_by_org_name &&
                selectedRow.sent_by_role && (
                  <div className="mt-8 flex items-center gap-4 justify-start print:mt-12">
                    <QRCodeGenerator
                      sentBy={selectedRow.sent_by_full_name}
                      sentByOrg={selectedRow.sent_by_org_name}
                      sentByRole={selectedRow.sent_by_role}
                    />
                    <div>
                      <h2 className="text-lg font-semibold">
                        {selectedRow.sent_by_full_name}
                      </h2>
                      <h2 className="text-md">
                        {selectedRow.sent_by_org_name}
                      </h2>
                    </div>
                  </div>
                )}
            </div>
            <CancelReportModal
              open={isCancelModalOpen}
              setOpen={setIsCancelModalOpen}
              reportId={selectedRow?.id}
            />
          </div>
          );
        })()}
      </>
    );
  },
);

export default TableColumn;
