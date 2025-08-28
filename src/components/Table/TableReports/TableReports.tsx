import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function TableReports({ data }: any) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<null | string>(null); // id string bo‘ladi

  const toggleRow = (id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
  };

  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="bg-[#eaeaea] h-[50px]">
          <TableHead className="w-[20%] pl-2 text-lg text-[#717171] rounded-tl-lg text-left rounded-bl-lg border-none">
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
          <TableHead className="text-right pr-2 text-[#717171] text-lg rounded-tr-lg rounded-br-lg w-[20%] border-none">
            {t("item_16")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.map((item: any) => (
          <>
            <TableRow
              key={item.id}
              className="h-[50px] cursor-pointer hover:bg-gray-100"
              onClick={() => toggleRow(item.id)}
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

            {/* DETAIL QISMI */}
            {activeId === item.id && (
              <div>
                <TableRow className="bg-[#f9f9f9]">
                  <TableCell colSpan={5} className="p-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300">
                        <thead className="bg-gray-200">
                          <tr>
                            {item.report_items[0]?.statement_columns?.map(
                              (col: any) => (
                                <th
                                  key={col.statement_column_id}
                                  className="px-2 py-1 border border-gray-300 text-left"
                                >
                                  {col.statement_column_name}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {item.report_items.map(
                            (reportItem: any, idx: number) => (
                              <tr key={idx}>
                                {reportItem.statement_columns.map(
                                  (col: any) => (
                                    <td
                                      key={col.statement_column_id}
                                      className="px-2 py-1 border border-gray-300 text-left"
                                    >
                                      {col.inners
                                        .map((inner: any) => inner.value)
                                        .join(", ")}
                                    </td>
                                  )
                                )}
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TableCell>
                </TableRow>
              </div>
            )}
          </>
        ))}
      </TableBody>
    </Table>
  );
}

export default TableReports;
