import {
  Fragment,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Edit2, MessageSquareWarning, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useAcceptReportMutation,
  useDeleteReportMutation,
  useSendReportMutation,
} from "@/services/reportsApi";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
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

    // 🔹 Yangi: Print uchun to'liq jadvalni olish
    const getPrintableTable = () => {
      return tableRef.current?.innerHTML;
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
        <div className="overflow-x-auto bg-white p-4 rounded-xl" ref={tableRef} id="printableTable">
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
                  {row.map((cell: any, cellIndex: number) => (
                    <th
                      key={cellIndex}
                      className="border w-[400px] border-black px-2 py-1 text-center"
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                    >
                      {cell.title}
                    </th>
                  ))}
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

        <div className="p-4 my-2 bg-white rounded-xl">
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
                className="bg-[#09B86F] text-[white] hover:bg-[#09B86F] cursor-pointer"
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
                    {item?.period}
                  </TableCell>
                  <TableCell className="w-[20%] text-base font-[300] border-none">
                    {item?.created_at}
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
          <div className="p-4 bg-white rounded-xl">
            <div className="flex items-center justify-between my-5">
              <div className="flex items-center gap-2">
                {selectedRow.status === "cancelled" && (
                  <span className="text-xl flex items-center gap-2 font-[500]">
                    <MessageSquareWarning color="#FF5445" size={36} />{" "}
                    Qaytarilish sababi:{" "}
                    <span className="text-red-500">
                      {selectedRow?.cancel_reason || "Noma'lum"}
                    </span>
                  </span>
                )}
              </div>
              <div>
                <div className="flex justify-end items-center gap-3 mb-3">
                  {(user_role === "tashkilot_rahbari" ||
                    user_role === "bolim_admin") && (
                    <Button
                      onClick={() => setIsCancelModalOpen(true)}
                      className="bg-[#FF5445B2] rounded border-1 border-[#FF5445] hover:bg-[#FF5445B2] hover:border-[#FF5445]"
                    >
                      {t("recycle")}
                    </Button>
                  )}
                  {user_role == "tashkilot_rahbari" && (
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
                      className="bg-[#09B86F] rounded w-[100px] hover:bg-[#09B86F]"
                    >
                      {isSending ? t("sending") : t("send2")}
                    </Button>
                  )}

                  {user_role == "bolim_admin" && (
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
                      className="bg-[#09B86F] rounded w-[150px] hover:bg-[#09B86F]"
                    >
                      {isAccepting
                        ? "Qabul qilinmoqda..."
                        : acceptedReports.has(selectedRow.id)
                        ? "Qabul qilindi"
                        : "Qabul qilish"}
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="bg-[#09B86F] rounded w-[100px] hover:bg-[#09B86F]">
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 mt-2 mr-2">
                      <DropdownMenuItem>
                        Hisobotni export qilib olish
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
                      {row.map((cell: any, cellIndex: number) => (
                        <th
                          key={cellIndex}
                          className="border w-[400px] border-black px-2 py-1 text-center"
                          colSpan={cell.colSpan}
                          rowSpan={cell.rowSpan}
                        >
                          {cell.title}
                        </th>
                      ))}
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
                  {/* 🔹 Selected Row */}
                  {selectedRow.report_items?.map(
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
                                {innerIndex === 0 && (
                                  <td
                                    className="border border-black px-2 py-1 text-center"
                                    rowSpan={maxInners}
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        className="bg-[#09B86F] hover:bg-[#09B86F]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(
                                            `/resource-management/update/${selectedRow?.id}`
                                          );
                                        }}
                                      >
                                        <Edit2 />
                                      </Button>
                                      <Button
                                        className="bg-[#09B86F] hover:bg-[#09B86F]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteReport(selectedRow.id);
                                        }}
                                      >
                                        <Trash2 />
                                      </Button>
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

                  {/* 🔥 Individual Rows */}
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
                                      ></td>
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
