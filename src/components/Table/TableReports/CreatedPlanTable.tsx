import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function CreatedPlantable({ data }: any) {
  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="bg-[#eaeaea] h-[50px]">
          <TableHead className="w-[20%] text-lg text-[#717171] text-left rounded-tl-lg rounded-bl-lg border-none">
            Tashkilot nomi
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[20%] text-left border-none">
            Hisobot nomi
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[20%] text-left border-none">
            Hisobot davri
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[20%] text-left border-none">
            Topshirilgan muddati
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
