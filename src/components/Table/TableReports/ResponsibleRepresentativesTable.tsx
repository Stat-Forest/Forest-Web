import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ResponsibleRepresentativesTable({ data }: any) {
  console.log(data)
  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="bg-[#eaeaea] h-[50px]">
          <TableHead className="w-[4%] text-lg text-[#717171] rounded-tl-lg rounded-bl-lg border-none">
            T/r:
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[14%]  border-none">
            Ismi
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[14%] border-none">
            Familiyasi
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[14%] border-none">
            Tashkilot nomi
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[14%] border-none">
            Millati
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[14%] border-none">
            Ma’lumoti
          </TableHead>
          <TableHead className="text-right text-[#717171] text-lg rounded-tr-lg rounded-br-lg w-[14%] border-none">
            Lavozimi
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.results?.map((item: any, index: any) => (
          <TableRow className="h-[50px]" key={index}>
            <TableCell className="w-[4%] text-lg font-[300] border-none">
              321
            </TableCell>
            <TableCell className="w-[14%] text-base font-[300] border-none">
              {item?.first_name}
            </TableCell>
            <TableCell className="w-[14%] text-base font-[300]  border-none">
              {item?.last_name}
            </TableCell>
            <TableCell className="w-[14%] text-base font-[300] border-none">
              Urmontexnoservis davlat unitar korxonasi
            </TableCell>
            <TableCell className="w-[14%] text-base font-[300] border-none">
              O’zbek
            </TableCell>
            <TableCell className="w-[14%] text-base font-[300] border-none">
              Oliy
            </TableCell>
            <TableCell className="w-[14%] text-right text-base font-[400] border-none">
              Bosh mutaxassis
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default ResponsibleRepresentativesTable;
