// TableColumn.tsx
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  useAcceptReportMutation,
  useDeleteReportMutation,
  useSendReportMutation,
} from "@/services/reportsApi";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import CancelReportModal from "@/components/Modals/CancelReportModal";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import ReportItemTable from "./ReportItemTable";
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
// import { exportToExcel } from "@/utils/exportToExcel";

const TableColumn = forwardRef(
  (
    {
      data = [],
      rows = [],
      onRowClick,
      selectedRow,
      userCheckTable,
      tableRowsData,
    }: any,
    ref
  ) => {
    const tableRef = useRef<HTMLDivElement>(null);
    // const printRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const [sendReport, { isLoading: isSending }] = useSendReportMutation();
    const user_role = useSelector((state: RootState) => state.auth.user?.role);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [deleteReport] = useDeleteReportMutation();
    const [acceptReport, { isLoading: isAccepting }] =
      useAcceptReportMutation();

    useImperativeHandle(ref, () => ({
      getTable: () => tableRef.current?.innerHTML,
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

    //     const handlePrint = () => {
    //       if (!printRef.current) return;
    //       const printContents = printRef.current.innerHTML;
    //       const printWindow = window.open("", "_blank");
    //       if (printWindow) {
    //         printWindow.document.write(`
    //   <html>
    //     <head>
    //       <title>Print Report</title>
    //       <style>
    //         * {
    //           font-family: sans-serif;
    //           box-sizing: border-box;
    //         }
    //         table, th, td {
    //           border: 1px solid black;
    //           border-collapse: collapse;
    //           padding: 6px;
    //           text-align: center;
    //         }
    //         body {
    //           padding: 20px;
    //         }
    //       </style>
    //     </head>
    //     <body>
    //       ${printContents}
    //     </body>
    //   </html>
    // `);

    //         printWindow.document.close();
    //         printWindow.focus();
    //         printWindow.print();
    //         printWindow.close();
    //       }
    //     };

    return (
      <>
        <div className="overflow-x-auto" ref={tableRef} id="printableTable">
          <table className="w-full border-collapse">
            <thead className="w-full">
              {headerRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {rowIndex === 0 && (
                    <th
                      className="border border-black px-2 py-1 text-center"
                      rowSpan={maxDepth}
                    >
                      T/R
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
                      className="border border-black px-2 py-1 text-center"
                      rowSpan={maxDepth}
                    >
                      Amallar
                    </th>
                  )}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row: any, rowIndex: number) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row)}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <td className="border border-black px-2 py-1 text-center">
                    {rowIndex + 1}
                  </td>
                  {row.report_items?.map((reportItem: any) =>
                    reportItem.statement_columns?.map((col: any) =>
                      col.inners?.map((inner: any, index: number) => (
                        <td
                          key={inner.id || index}
                          className="border min-w-[380px] border-black px-2 py-1 text-center"
                        >
                          {inner.value}
                        </td>
                      ))
                    )
                  )}

                  <td className="border border-black px-2 py-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        className="bg-[#09B86F] hover:bg-[#09B86F]"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/resource-management/update/${row?.id}`);
                        }}
                      >
                        <Edit2 />
                      </Button>
                      <Button
                        className="bg-[#09B86F] hover:bg-[#09B86F]"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteReport(row.id);
                          console.log(row.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="py-14 pr-2">
          <ReportItemTable />
        </div>

        {/* Detal ko‘rinish */}
        {userCheckTable && selectedRow && (
          <>
            <div className="flex items-center justify-between my-5">
              <div className="flex items-center gap-2"></div>
              <div>
                <div className="flex justify-end items-center gap-3 mb-3">
                  {(user_role === "tashkilot_rahbari" ||
                    user_role === "bolim_admin" ||
                    user_role === "super_admin") && (
                    <Button
                      onClick={() => setIsCancelModalOpen(true)}
                      className="bg-[#FF5445B2] rounded border-1 border-[#FF5445] hover:bg-[#FF5445B2] hover:border-[#FF5445]"
                    >
                      Qayta ishlash
                    </Button>
                  )}
                  {(user_role == "tashkilot_rahbari" ||
                    user_role === "super_admin") && (
                    <Button
                      onClick={async () => {
                        if (!tableRowsData[0]?.id) {
                          alert("Hisobot ID topilmadi");
                          return;
                        }

                        try {
                          await sendReport({
                            id: tableRowsData[0]?.id,
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
                      {isSending ? "Yuborilmoqda..." : "Yuborish"}
                    </Button>
                  )}

                  {(user_role == "bolim_admin" ||
                    user_role === "super_admin") && (
                    <Button
                      onClick={async () => {
                        if (!tableRowsData[0]?.id) {
                          alert("Hisobot ID topilmadi");
                          return;
                        }

                        try {
                          await acceptReport({
                            id: tableRowsData[0]?.id,
                          }).unwrap();
                          alert("Hisobot muvaffaqiyatli qabul qilindi!");
                        } catch (error: any) {
                          const msg =
                            error?.data?.message ||
                            "Qabul qilishda xatolik yuz berdi";
                          alert(msg);
                        }
                      }}
                      disabled={isAccepting}
                      className="bg-[#09B86F] rounded w-[150px] hover:bg-[#09B86F]"
                    >
                      {isAccepting ? "Qabul qilinmoqda..." : "Qabul qilish"}
                    </Button>
                  )}
                  {
                    //  <DropdownMenu>
                    //   <DropdownMenuTrigger asChild>
                    //     <button className="py-1.5 font-semibold w-[100px]  rounded bg-[#09B86F] border-1 text-[white]">
                    //       Export
                    //     </button>
                    //   </DropdownMenuTrigger>
                    //    <DropdownMenuContent className="w-56 mt-2 mr-2">
                    //      <DropdownMenuItem onClick={() => exportToExcel(col?.children, filteredRows)}>
                    //        Hisobodni export qilib olish
                    //      </DropdownMenuItem>
                    //      <DropdownMenuItem onClick={handlePrint}>
                    //        Hisobodni chop etish
                    //      </DropdownMenuItem>
                    //    </DropdownMenuContent>
                    //    </DropdownMenu>
                  }
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
                          T/R
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
                  <tr>
                    <td className="border border-black px-2 py-1 text-center">
                      1
                    </td>
                    {selectedRow.report_items?.map((reportItem: any) =>
                      reportItem.statement_columns?.map((col: any) =>
                        col.inners?.map((inner: any, index: number) => (
                          <td
                            key={inner.id || index}
                            className="border min-w-[380px] border-black px-2 py-1 text-center"
                          >
                            {inner.value}
                          </td>
                        ))
                      )
                    )}
                    <td className="border border-black px-2 py-1 text-center">
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
                            console.log(selectedRow);
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* QR Code pastga qo‘shiladi (printda ham chiqadi) */}
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
          </>
        )}
      </>
    );
  }
);

export default TableColumn;
