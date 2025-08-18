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
  console.log(data);
  const { t } = useTranslation();

  const [activeId, setActiveId] = useState<null | number>(null); // faqat bitta aktiv ID

  const toggleRow = (id: number) => {
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
        {data?.map((item: any, index: any) => (
          <>
            <TableRow
              className="h-[50px]"
              key={index}
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
                    ? "Qaytailgan"
                    : item.status == "saved"
                    ? "Qoralama"
                    : "Jo'natilgan"}
                </span>
              </TableCell>
            </TableRow>
            {/*  */}
            {activeId === item.id && (
              <table>
                <tr>
                  <td colSpan={5} className="py-4 px-6 bg-[#f9f9f9] text-left">
                    <div className="text-sm text-gray-600">
                      <strong>ID:</strong> {item.id}
                    </div>
                  </td>
                </tr>
              </table>
            )}
          </>
        ))}
      </TableBody>
    </Table>
  );
}

export default TableReports;
