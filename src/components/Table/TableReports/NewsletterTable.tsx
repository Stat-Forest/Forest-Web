import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface NewsletterTableProps {
  data: any[];
  currentPage: number;
  perPage: number;
}

function NewsletterTable({ data, currentPage, perPage }: NewsletterTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const toggleRow = (id: number, statementName?: string) => {
    navigate(`/resource-management/${id}/${encodeURIComponent(statementName || "")}`);
  };

  // Global raqamni hisoblash: (currentPage - 1) * perPage + index + 1
  const getGlobalIndex = (index: number) => {
    return (currentPage - 1) * perPage + index + 1;
  };

  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="bg-[#eaeaea] h-[50px]">
          <TableHead className="text-[#717171] border-none text-left pl-5 text-lg w-[10%]">
            №
          </TableHead>
          <TableHead className="text-[#717171] border-none text-left text-lg w-[30%]">
            {t("item_83")}
          </TableHead>
          <TableHead className="text-[#717171] border-none text-lg text-left w-[20%]">
            {t("item_14")}
          </TableHead>
          <TableHead className="text-[#717171] border-none text-lg w-[20%] text-left">
            {t("item_17")}
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data?.map((item, index) => (
            <TableRow
              key={item.id || `newsletter-${index}`}
              className="h-[50px] cursor-pointer hover:bg-gray-100"
              onClick={() => toggleRow(item?.statement?.id, item?.statement?.name)}
            >
              {/* ✅ Global raqam: 1-20, 21-40, 41-60, ... */}
              <TableCell className="text-base font-[300] border-none">
                {getGlobalIndex(index)}
              </TableCell>
              <TableCell className="text-base font-[300] border-none">
                {item?.statement?.name || "-"}
              </TableCell>
              <TableCell className="text-base font-[300] border-none">
                {item?.statement?.period || "-"}
              </TableCell>
              <TableCell className="text-base font-[300] border-none">
                {item?.submit_at || "-"}
              </TableCell>
            </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default NewsletterTable;
