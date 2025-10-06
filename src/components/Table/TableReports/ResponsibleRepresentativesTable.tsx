import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

interface ResponsibleRepresentativesTableProps {
  data: any[];
  currentPage: number;
  perPage: number;
}

function ResponsibleRepresentativesTable({
  data,
  currentPage,
  perPage,
}: ResponsibleRepresentativesTableProps) {
  const { t } = useTranslation();

  // Global raqamni hisoblash: (currentPage - 1) * perPage + index + 1
  const getGlobalIndex = (index: number) => {
    return (currentPage - 1) * perPage + index + 1;
  };

  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="bg-[#eaeaea] h-[50px]">
          <TableHead className="w-[4%] text-left text-lg text-[#717171]">
            №
          </TableHead>
          <TableHead className="text-[#717171] text-left text-lg w-[12%]">
            {t("item_19") /* First name */}
          </TableHead>
          <TableHead className="text-[#717171] text-left text-lg w-[12%]">
            {t("item_20") /* Last name */}
          </TableHead>
          <TableHead className="text-[#717171] text-left text-lg w-[18%]">
            {t("item_12") /* Organization */}
          </TableHead>
          <TableHead className="text-[#717171] text-left text-lg w-[10%]">
            {t("item_21") /* Nationality */}
          </TableHead>
          <TableHead className="text-[#717171] text-left text-lg w-[14%]">
            {t("item_22") /* Phone */}
          </TableHead>
          <TableHead className="text-right text-[#717171] text-lg w-[14%]">
            {t("item_23") /* Role */}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.map((item: any, index: number) => (
          <TableRow className="h-[50px]" key={item.user_number || index}>
            <TableCell className="w-[4%] text-lg font-[300] border-none">
              {getGlobalIndex(index)}
            </TableCell>
            <TableCell className="w-[12%] text-base font-[300] border-none">
              {item?.first_name || "-"}
            </TableCell>
            <TableCell className="w-[12%] text-base font-[300] border-none">
              {item?.last_name || "-"}
            </TableCell>
            <TableCell className="w-[18%] text-base font-[300] border-none">
              {item?.organization_name || "-"}
            </TableCell>
            <TableCell className="w-[10%] text-base font-[300] border-none">
              {item?.nationality || "-"}
            </TableCell>
            <TableCell className="w-[14%] text-base font-[300] border-none">
              {item?.phone_number || "-"}
            </TableCell>
            <TableCell className="w-[14%] text-right text-base font-[400] border-none">
              {item?.role_display || "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default ResponsibleRepresentativesTable;
