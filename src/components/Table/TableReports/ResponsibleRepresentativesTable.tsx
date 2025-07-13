import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

function ResponsibleRepresentativesTable({ data }: any) {
  const { t } = useTranslation();
  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="bg-[#eaeaea] h-[50px]">
          <TableHead className="w-[4%] text-left text-lg text-[#717171] rounded-tl-lg rounded-bl-lg border-none">
            T/r:
          </TableHead>
          <TableHead className="text-[#717171] text-left text-lg w-[14%] border-none">
            {t("item_19")}
          </TableHead>
          <TableHead className="text-[#717171] text-left text-lg w-[14%] border-none">
            {t("item_20")}
          </TableHead>
          <TableHead className="text-[#717171] text-left text-lg w-[14%] border-none">
            {t("item_12")}
          </TableHead>
          <TableHead className="text-[#717171] text-left text-lg w-[14%] border-none">
            {t("item_21")}
          </TableHead>
          <TableHead className="text-[#717171] text-left text-lg w-[14%] border-none">
            {t("item_22")}
          </TableHead>
          <TableHead className="text-right text-[#717171] text-lg rounded-tr-lg rounded-br-lg w-[14%] border-none">
            {t("item_23")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.map((item: any, index: number) => (
          <TableRow className="h-[50px]" key={index}>
            <TableCell className="w-[4%] text-lg font-[300] border-none">
              {index + 1}
            </TableCell>
            <TableCell className="w-[14%] text-base font-[300] border-none">
              {item?.first_name}
            </TableCell>
            <TableCell className="w-[14%] text-base font-[300] border-none">
              {item?.last_name}
            </TableCell>
            <TableCell className="w-[14%] text-base font-[300] border-none">
              {item?.organization__name || "-"}
            </TableCell>
            <TableCell className="w-[14%] text-base font-[300] border-none">
              {item?.nationality}
            </TableCell>
            <TableCell className="w-[14%] text-base font-[300] border-none">
              Oliy
            </TableCell>
            <TableCell className="w-[14%] text-right text-base font-[400] border-none">
              {item?.role_display}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default ResponsibleRepresentativesTable;
