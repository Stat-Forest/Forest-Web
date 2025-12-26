import {
  Fragment,
  forwardRef,
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
import {
  useAcceptReportMutation,
  useDeleteReportMutation,
  useGetReportPlantByIdQuery,
  useSendReportMutation,
  useExportExcelMutation,
} from "@/services/reportsApi";
import { skipToken } from "@reduxjs/toolkit/query";
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
import { periods, regions, statuses } from "@/services/constants";

const TableColumn = forwardRef(
  (
    {
      data = [],
      rows = [],
      onRowClick,
      selectedRow,
      allReports,
      individualRows = [],
      enablePlantDetail = false,
      setSelectedOrganizationReport,
      setSelectedPeriodReport,
      setSelectedStatusReport,
      setSearchTermReport,
      selectedOrganizationReport,
      selectedPeriodReport,
      selectedStatusReport,
      searchTermReport,
    }: any,
    ref
  ) => {
    const tableRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
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


    // Barcha plant detail report nomlar uchun plant detail ko'rsatish
    // (enablePlantDetail true bo'lsa, barcha report nomlar uchun ishlaydi)
    const isPlantStatement = enablePlantDetail;

    const { data: plantDetail, isLoading: isPlantDetailLoading } =
      useGetReportPlantByIdQuery(
        isPlantStatement && selectedRow?.id
          ? { id: String(selectedRow.id) }
          : skipToken
      );

    // Plant detail kelganda: selectedRow dagi column tartibini saqlab qolish uchun shunga moslab normalize qilamiz
    const expectedColumnIds: string[] =
      selectedRow?.report_items?.[0]?.statement_columns?.map(
        (c: any) => c.statement_column_id
      ) || [];

    const normalizedPlantReportItems = (plantDetail as any)?.report_items
      ? ((plantDetail as any).report_items || []).map((reportItem: any) => {
          const cols = reportItem.statement_columns || [];
          const normalizedColumns =
            expectedColumnIds.length > 0
              ? expectedColumnIds.map((colId) => {
                  const found = cols.find(
                    (c: any) => c.statement_column_id === colId
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
      const name = (col?.statement_column_name ?? col?.statement_column_title ?? "")
        .toString()
        .toLowerCase();
      // API example: "... – Tashkilot nomi"
      return name.includes("tashkilot") && name.includes("nomi");
    };

    const getPlantNamesForRow = (statementColumns: any[], innerIndex: number) => {
      const names = (statementColumns || [])
        .map((c: any) => c?.inners?.[innerIndex]?.plant_name)
        .filter(Boolean);
      // bir nechta plant bo'lsa, bittalab ko'rsatamiz
      return Array.from(new Set(names)).join(", ");
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
          `[data-print-id="${el.getAttribute("data-print-id")}"]`
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
        0
      );
    };

    const headerRows = renderHeaderRows();

    return (
      <>
        <div
          className="overflow-x-auto bg-ice p-4 rounded-xl"
          ref={tableRef}
          id="printableTable"
        >
          <table className="w-full border-collapse">
            <thead className="w-full">
              {headerRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {rowIndex === 0 && (
                    <th
                      className="border border-black px-2 py-1 text-center"
                      rowSpan={maxDepth}
                    >
                      №
                    </th>
                  )}
                  {row.map((cell: any, cellIndex: number) => {
                    // Plant detail rejimida "Tashkilot nomi" o'rniga "O'simlik nomi" ko'rsatish
                    let displayTitle = cell.title;
                    if (isPlantStatement && cell.title) {
                      const titleLower = cell.title.toLowerCase();
                      if (titleLower.includes("tashkilot") && titleLower.includes("nomi")) {
                        displayTitle = cell.title.replace(/tashkilot nomi/gi, "O'simlik nomi");
                      }
                    }
                    return (
                      <th
                        key={cellIndex}
                        className="border w-[400px] border-black px-2 py-1 text-center"
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
                const maxInners = Math.max(
                  ...row.report_items.map((reportItem: any) =>
                    Math.max(
                      ...reportItem.statement_columns.map(
                        (col: any) => col.inners?.length || 0
                      )
                    )
                  )
                );

                return (
                  <Fragment key={row.id}>
                    {/* 🔹 Parent row */}
                    {Array.from({ length: maxInners }).map((_, innerIndex) => (
                      <tr
                        key={innerIndex}
                        className="cursor-pointer hover:bg-gray-100"
                      >
                        {/* TR faqat birinchi qatorda chiqadi */}
                        {innerIndex === 0 && (
                          <td
                            className="border border-black px-2 py-1 text-center"
                            rowSpan={maxInners}
                          >
                            {rowIndex + 1}
                          </td>
                        )}

                        {row.report_items?.map((reportItem: any) =>
                          reportItem.statement_columns?.map((col: any) => (
                            <td
                              key={col.id}
                              className="border min-w-[380px] border-black px-2 py-1 text-center font-bold"
                            >
                              {col.inners?.[innerIndex]?.value || ""}
                            </td>
                          ))
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
                                  (col: any) => col.inners?.length || 0
                                )
                              )
                            )
                          );

                          return (
                            <Fragment key={child.id || childIndex}>
                              {Array.from({ length: childMaxInners }).map(
                                (_, innerIndex) => (
                                  <tr
                                    key={innerIndex}
                                    onClick={() => onRowClick(child)}
                                    className="cursor-pointer hover:bg-gray-100"
                                  >
                                    {/* Child TR faqat birinchi qatorda chiqadi */}
                                    {innerIndex === 0 && (
                                      <td
                                        className="border border-black px-2 py-1 text-center"
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
                                              className="border min-w-[380px] border-black px-2 py-1 text-center"
                                            >
                                              {col.inners?.[innerIndex]
                                                ?.value || ""}
                                            </td>
                                          )
                                        )
                                    )}
                                  </tr>
                                )
                              )}
                            </Fragment>
                          );
                        }
                      )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 my-2 bg-ice rounded-xl">
          <div className="flex items-center gap-2 mb-6 ">
            <div>
              <Input
                type="text"
                placeholder={`${t("item_79")}...`}
                className="w-[260px] text-xl min-h-[40px] border-black"
                value={searchTermReport}
                onChange={(e: any) => setSearchTermReport(e.target.value)}
              />
            </div>

            <div>
              <Select
                value={selectedOrganizationReport}
                onValueChange={(value) => setSelectedOrganizationReport(value)}
              >
                <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={selectedPeriodReport}
                onValueChange={(value) => setSelectedPeriodReport(value)}
              >
                <SelectTrigger className="w-[200px] text-xl min-h-[40px] border-black">
                  <SelectValue placeholder={`${t("reportType")}`} />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {i18n.language === "uz"
                        ? period.label_uz
                        : period.label_ru}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={selectedStatusReport}
                onValueChange={(value) => setSelectedStatusReport(value)}
              >
                <SelectTrigger className="w-[200px] text-xl min-h-[40px] border-black">
                  <SelectValue placeholder={t("item_28")} />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
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
                className="bg-[#3B82F6] text-[white] hover:bg-[#2563EB] cursor-pointer"
              >
                {t("reset")}
              </Button>
            </div>
          </div>
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-[#eaeaea] h-[50px]">
                <TableHead className="w-[20%] pl-2 text-lg text-[#717171] border-none">
                  {t("item_12")}
                </TableHead>
                <TableHead className="text-[#717171] text-left text-lg w-[20%] border-none">
                  {t("item_83")}
                </TableHead>
                <TableHead className="text-[#717171] text-left text-lg w-[20%] border-none">
                  {t("item_14")}
                </TableHead>
                <TableHead className="text-[#717171] text-left text-lg w-[20%] border-none">
                  {t("item_15")}
                </TableHead>
                <TableHead className="text-right pr-2 text-[#717171] text-lg w-[20%] border-none">
                  {t("item_16")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allReports?.map((item: any) => (
                <TableRow
                  key={item.id}
                  className={`h-[50px] cursor-pointer hover:bg-gray-100 ${
                    selectedRow?.id === item.id ? "bg-gray-200" : ""
                  }`}
                  onClick={() =>
                    onRowClick?.(selectedRow?.id === item.id ? null : item)
                  }
                >
                  <TableCell className="w-[20%] text-lg font-[300] border-none">
                    {item?.organization_name}
                  </TableCell>
                  <TableCell className="w-[20%] text-base font-[300] border-none">
                    {item?.statement_name}
                  </TableCell>
                  <TableCell className="w-[20%] text-base font-[300] border-none">
                    {item?.submit_at}
                  </TableCell>
                  <TableCell className="w-[20%] text-base font-[300] border-none">
                    {[
                      item?.accepted_at,
                      item?.cancelled_at,
                      item?.sent_at,
                      item?.created_at,
                    ].find((v) => v != null && v !== "")}
                  </TableCell>
                  <TableCell className="text-right text-base font-[400] border-none">
                    <span
                      className={`px-4 py-1 rounded-full ${
                        item.status === "accepted"
                          ? "bg-[#7fa1f84f] text-[#4579FF]"
                          : item.status === "cancelled"
                          ? "bg-[#f9695c74] text-[#FF5445]"
                          : item.status == "saved"
                          ? "bg-[#65656555] text-[#4D4D4D]"
                          : "bg-[#fcc7544a] text-[#fd9c15]"
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

        {/* Detal ko'rinish */}
        {selectedRow && (
          <div className="p-4 bg-ice rounded-xl">
            <div className="flex items-center justify-between my-5">
              <div className="flex gap-2 flex-col">
                {selectedRow.status === "cancelled" && (
                  <span className="text-xl flex items-center gap-2 font-[500]">
                    <MessageSquareWarning color="#FF5445" size={36} />{" "}
                    Qaytarilish sababi:{" "}
                    <span className="text-red-500">
                      {selectedRow?.cancel_reason || "Noma'lum"}
                    </span>
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className="flex text-xl items-center">
                    <NotebookText size={30} /> {t("deadline")}:
                  </span>
                  <span className="text-xl">{selectedRow.submit_at}</span>
                </div>
                <div className="text-lg">
                 <b className="font-bold">{t('item_12')}:</b> {selectedRow.organization_name}
                </div>
                {selectedRow.foot_note && (
                  <div className="text-lg mt-2">
                    <b className="font-bold">Izoh:</b> {selectedRow.foot_note}
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-end items-center gap-3 mb-3">
                  {/* 🔹 Qaytarish (Recycle) button */}
                  {((user_role === "tashkilot_rahbari" &&
                    selectedRow?.status == "saved") ||
                    (user_role === "bolim_admin" &&
                      selectedRow?.status == "sent")) && (
                      <Button
                        onClick={() => setIsCancelModalOpen(true)}
                        className="bg-[#FF5445B2] rounded border-1 border-[#FF5445] hover:bg-[#FF5445B2] hover:border-[#FF5445]"
                      >
                        {t("recycle")}
                      </Button>
                    )}

                  {/* 🔹 Yuborish (Send) button - faqat tashkilot_rahbari va saved status'da */}
                  {user_role == "tashkilot_rahbari" &&
                    selectedRow?.status == "saved" && (
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
                            const msg =
                              error?.data?.message ||
                              "Hisobot yuborishda xatolik yuz berdi";
                            alert(msg);
                          }
                        }}
                        disabled={isSending}
                        className="bg-[#3B82F6] rounded w-[100px] hover:bg-[#2563EB]"
                      >
                        {isSending ? t("sending") : t("send2")}
                      </Button>
                    )}

                  {/* 🔹 Qabul qilish (Accept) button - faqat bolim_admin va sent status'da */}
                  {user_role == "bolim_admin" &&
                    selectedRow?.status == "sent" && (
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
                            const msg =
                              error?.data?.message ||
                              "Qabul qilishda xatolik yuz berdi";
                            alert(msg);
                          }
                        }}
                        disabled={
                          isAccepting || acceptedReports.has(selectedRow.id)
                        }
                        className="bg-[#3B82F6] rounded w-[150px] hover:bg-[#2563EB]"
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
                      <Button className="bg-[#3B82F6] rounded w-[100px] hover:bg-[#2563EB]">
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
            <div className="mt-6 border border-black overflow-x-auto">
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
                        // Plant detail rejimida "Tashkilot nomi" o'rniga "O'simlik nomi" ko'rsatish
                        let displayTitle = cell.title;
                        if (isPlantStatement && cell.title) {
                          const titleLower = cell.title.toLowerCase();
                          if (titleLower.includes("tashkilot") && titleLower.includes("nomi")) {
                            displayTitle = cell.title.replace(/tashkilot nomi/gi, "O'simlik nomi");
                          }
                        }
                        return (
                          <th
                            key={cellIndex}
                            className="border w-[400px] border-black px-2 py-1 text-center"
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
                          className="border border-black px-2 py-1 text-center"
                        >
                          Amallar
                        </th>
                      )}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {/* 🔹 Selected Row (jami) – plant-report rejimida ko'rinmasin */}
                  {!enablePlantDetail &&
                    selectedRow.report_items?.map(
                      (reportItem: any, reportIndex: number) => {
                        const maxInners = Math.max(
                          ...reportItem.statement_columns.map(
                            (col: any) => col.inners?.length || 0
                          )
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
                                    )
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
                                              e.stopPropagation();;
                                              navigate(
                                                `/resource-management/update/${selectedRow?.id}`
                                              );
                                              window.location.reload(); 
                                            }}
                                          >
                                            <Edit2 />
                                          </Button>
                                          {selectedRow.status == "saved" && (
                                            <Button
                                              className="bg-[#3B82F6] hover:bg-[#2563EB]"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteReport(selectedRow.id);
                                                window.location.reload();
                                              }}
                                            >
                                              <Trash2 />
                                            </Button>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                </tr>
                              )
                            )}
                          </Fragment>
                        );
                      }
                    )}

                  {/* 🌱 Plant Detail (faqat Ko'chat va Nihol / Urug' xarakati Reja) */}
                  {isPlantStatement && (
                    <>

                      {isPlantDetailLoading ? (
                        <tr>
                          <td
                            className="border border-black px-2 py-3 text-center"
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
                                (col: any) => col.inners?.length || 0
                              )
                            );

                            return (
                              <Fragment key={`plant-${reportIndex}`}>
                                {Array.from({ length: maxInners }).map(
                                  (_, innerIndex) => (
                                    <tr key={`plant-${reportIndex}-${innerIndex}`}>
                                      {/* T/R bo'sh */}
                                      {innerIndex === 0 && (
                                        <td
                                          className="border border-black px-2 py-1 text-center"
                                          rowSpan={maxInners}
                                        >{innerIndex +1}</td>
                                      )}

                                      {reportItem.statement_columns?.map(
                                        (col: any) => {
                                          const plantNames = getPlantNamesForRow(
                                            reportItem.statement_columns || [],
                                            innerIndex
                                          );

                                          return (
                                            <td
                                              key={col.statement_column_id || col.id}
                                              className="border min-w-[120px] border-black px-2 py-1 text-center"
                                            >
                                              {/* ✅ Tashkilot nomi o'rniga: plant_name */}
                                              {isOrganizationColumn(col)
                                                ? plantNames || ""
                                                : formatInnerValue(
                                                    col.inners?.[innerIndex]
                                                  )}
                                            </td>
                                          );
                                        }
                                      )}

                                      {/* Amallar ustuni bo'sh */}
                                      {innerIndex === 0 && (
                                        <td
                                          className="border border-black px-2 py-1 text-center"
                                          rowSpan={maxInners}
                                        >
                                          -
                                        </td>
                                      )}
                                    </tr>
                                  )
                                )}
                              </Fragment>
                            );
                          }
                        )
                      )}
                    </>
                  )}

                  {/* 🔥 Individual Rows (Jami), plant mode'da ham ko'rsatamiz */}
                  {individualRows?.length > 0 &&
                    individualRows.map((indRow: any) =>
                      indRow.report_items?.map(
                        (reportItem: any, reportIndex: number) => {
                          const maxInners = Math.max(
                            ...reportItem.statement_columns.map(
                              (col: any) => col.inners?.length || 0
                            )
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
                                      >{innerIndex +1}</td>
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
                                      )
                                    )}

                                    {/* Amallar ustuni bo'sh */}
                                    {innerIndex === 0 && (
                                      <td
                                        className="border border-black px-2 py-1 text-center"
                                        rowSpan={maxInners}
                                      >
                                        -
                                      </td>
                                    )}
                                  </tr>
                                )
                              )}
                            </Fragment>
                          );
                        }
                      )
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
        )}
      </>
    );
  }
);

export default TableColumn;
