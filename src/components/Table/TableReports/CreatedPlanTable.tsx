import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

function CreatedPlantable({ data }: any) {
  const { t } = useTranslation();
  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="bg-[#eaeaea] h-[50px]">
          <TableHead className="w-[20%] text-lg text-[#717171] text-left rounded-tl-lg rounded-bl-lg border-none">
            {t("item_12")}
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[20%] text-left border-none">
            {t("item_83")}
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[20%] text-left border-none">
            {t("item_14")}
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[20%] text-left border-none">
            {t("item_15")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.map((item: any, index: number) => (
          <TableRow className="h-[50px]" key={index}>
            <TableCell className="w-[20%] text-lg font-[300] border-none">
              {item?.organization_name}
            </TableCell>
            <TableCell className="w-[20%] text-base font-[300] border-none">
              {item?.statement_name}
            </TableCell>
            <TableCell className="w-[20%] text-base font-[300] border-none">
              {item?.year}
            </TableCell>
            <TableCell className="w-[20%] text-base font-[300] border-none">
              {item?.plan_value}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default CreatedPlantable;
