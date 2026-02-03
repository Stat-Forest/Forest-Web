import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function TableReports({ data, deadline_at = false }: any) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // const [activeId, setActiveId] = useState<null | string>(null); // id string bo‘ladi

  // const toggleRow = (id: string) => {
  //   setActiveId((prev) => (prev === id ? null : id));
  // };

  return (
    <div>
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
            {deadline_at && (
              <TableHead className="text-[#717171] text-left text-lg w-[20%] border-none">
                {t("deadline")}
              </TableHead>
            )}

            <TableHead className="text-right pr-2 text-[#717171] text-lg rounded-tr-lg rounded-br-lg w-[20%] border-none">
              {t("item_16")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((item: any) => (
            <TableRow
              key={item.id}
              className="h-[50px] cursor-pointer hover:bg-gray-100"
              onClick={() =>
                navigate(
                  `/resource-management/${item.statement}/${encodeURIComponent(item?.statement_name || "")}`,
                )
              }
            >
              <TableCell className="w-[40%] text-lg font-[300] border-none whitespace-normal break-words">
                {item?.organization_name}
              </TableCell>

              <TableCell className="w-[20%] text-base font-[300] border-none whitespace-normal break-words">
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

              {deadline_at && (
                <TableCell className="w-[20%] text-base font-[600] border-none text-red-500">
                  {item?.deadline_at}
                </TableCell>
              )}

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
  );
}

export default TableReports;
