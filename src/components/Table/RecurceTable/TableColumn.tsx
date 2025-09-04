// TableColumn.tsx
import {
  Fragment,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useAcceptReportMutation,
  useDeleteReportMutation,
  useGetAllReportsQuery,
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
import { skipToken } from "@reduxjs/toolkit/query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const TableColumn = forwardRef(
  (
    {
      data = [],
      rows = [],
      onRowClick,
      selectedRow,
      userCheckTable,
      statement_id,
    }: any,
    ref
  ) => {
    // Tüm hook'ları bileşenin en başında çağırın
    const tableRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [sendReport, { isLoading: isSending }] = useSendReportMutation();
    const user_role = useSelector((state: RootState) => state.auth.user?.role);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [deleteReport] = useDeleteReportMutation();
    const [acceptReport, { isLoading: isAccepting }] =
      useAcceptReportMutation();
    const [selectedOrganization, setSelectedOrganization] = useState("");
    const [selectedPeriod, setSelectedPeriod] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [acceptedReports, setAcceptedReports] = useState(new Set());

    // useGetAllReportsQuery hook'unu her zaman çağırın, skipToken ile koşullu yapın
    const {
      data: report,
      isLoading,
      error,
    } = useGetAllReportsQuery(
      statement_id
        ? {
            statement: statement_id,
            status: `status=${selectedStatus}`,
            organization__region: selectedOrganization,
            statement__period: selectedPeriod,
            search: searchTerm,
          }
        : skipToken
    );

    useImperativeHandle(ref, () => ({
      getTable: () => tableRef.current?.innerHTML,
    }));

    // Loading ve error durumlarını hook çağrılarından SONRA kontrol edin
    if (isLoading) return <h1>loading...</h1>;
    if (error) return <h1>error</h1>;

    console.log(statement_id);
    console.log(report);

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

    // ✅ Toggle row funksiyasi qo‘shildi
    const toggleRow = (row: any) => {
      if (selectedRow?.id === row.id) {
        onRowClick(null); // ikkinchi marta bosilsa yopiladi
      } else {
        onRowClick(row); // detail ochiladi
      }
    };

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
                <Fragment key={row.id}>
                  {/* Asosiy row */}
                  <tr
                    // onClick={() => onRowClick(row)}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    <td className="border border-black px-2 py-1 text-center"></td>
                    {row.report_items?.map((reportItem: any) =>
                      reportItem.statement_columns?.map((col: any) =>
                        col.inners?.map((inner: any) => (
                          <td
                            key={inner.id}
                            className="border min-w-[380px] border-black px-2 py-1 text-center font-bold"
                          >
                            {inner.value}
                          </td>
                        ))
                      )
                    )}

                    <td className="border border-black px-2 py-1 text-center"></td>
                  </tr>

                  {/* Faqat children_reports mavjud bo'lsa qo'shiladi */}
                  {row.children_reports?.length > 0 &&
                    row.children_reports.map(
                      (child: any, childIndex: number) => (
                        <tr
                          key={child.id || childIndex}
                          onClick={() => onRowClick(child)}
                          className="cursor-pointer hover:bg-gray-100"
                        >
                          <td className="border border-black px-2 py-1 text-center">
                            {rowIndex + 1}.{childIndex + 1}
                          </td>

                          {child.report_items?.map((reportItem: any) =>
                            reportItem.statement_columns?.map((col: any) =>
                              col.inners?.map((inner: any) => (
                                <td
                                  key={inner.id}
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
                                    `/resource-management/update/${row?.id}`
                                  );
                                }}
                              >
                                <Edit2 />
                              </Button>
                              <Button
                                className="bg-[#09B86F] hover:bg-[#09B86F]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteReport(row.id);
                                }}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="py-14 pr-2">
          <div className="flex items-center gap-5 mb-6">
            <div>
              <Input
                type="text"
                placeholder="Qidiruv..."
                className="w-[260px] text-xl min-h-[40px] border-black"
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <Select
                value={selectedOrganization}
                onValueChange={(value) => setSelectedOrganization(value)}
              >
                <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tashkent">Tashkent</SelectItem>
                  <SelectItem value="namangan">Namangan</SelectItem>
                  <SelectItem value="andijon">Andijon</SelectItem>
                  <SelectItem value="fargona">Fergana</SelectItem>
                  <SelectItem value="buxoro">Bukhara</SelectItem>
                  <SelectItem value="samarqand">Samarkand</SelectItem>
                  <SelectItem value="navoiy">Navoi</SelectItem>
                  <SelectItem value="qashqadaryo">Qashqadarya</SelectItem>
                  <SelectItem value="surxondaryo">Surxondaryo</SelectItem>
                  <SelectItem value="xorazm">Khorezm</SelectItem>
                  <SelectItem value="sirdaryo">Sirdaryo</SelectItem>
                  <SelectItem value="jizzax">Jizzakh</SelectItem>
                  <SelectItem value="qoraqalpog'iston">
                    Karakalpakstan
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={selectedPeriod}
                onValueChange={(value) => setSelectedPeriod(value)}
              >
                <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                  <SelectValue placeholder="Hisobot turi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Kunlik</SelectItem>
                  <SelectItem value="weekly">Haftalik</SelectItem>
                  <SelectItem value="monthly">Oylik</SelectItem>
                  <SelectItem value="quarterly">Choraklik (3 oy)</SelectItem>
                  <SelectItem value="yearly">Yillik</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value)}
              >
                <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                  <SelectValue placeholder="Hisobot holati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saved">Qoralama</SelectItem>
                  <SelectItem value="sent">Jo'natilgan</SelectItem>
                  <SelectItem value="cancelled">Qaytarilgan</SelectItem>
                  <SelectItem value="accepted">Qabul qilingan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button
                onClick={() => {
                  setSelectedOrganization("");
                  setSelectedPeriod("");
                  setSelectedStatus("");
                  setSearchTerm("");
                }}
                className="bg-[#09B86F] text-[white] hover:bg-[#09B86F] cursor-pointer"
              >
                Reset
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
              {report?.map((item: any) => (
                <TableRow
                  key={item.id}
                  className={`h-[50px] cursor-pointer hover:bg-gray-100 ${
                    selectedRow?.id === item.id ? "bg-gray-200" : ""
                  }`}
                  onClick={() => toggleRow(item)}
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
                        ? "Qabul qilingan"
                        : item.status == "cancelled"
                        ? "Qaytarilgan"
                        : item.status == "saved"
                        ? "Qoralama"
                        : "Jo'natilgan"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Detal ko'rinish */}
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
                      {isSending ? "Yuborilmoqda..." : "Yuborish"}
                    </Button>
                  )}

                  {(user_role == "bolim_admin" ||
                    user_role === "super_admin") && (
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
                          setAcceptedReports((prev) => {
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
          </>
        )}
      </>
    );
  }
);

export default TableColumn;
