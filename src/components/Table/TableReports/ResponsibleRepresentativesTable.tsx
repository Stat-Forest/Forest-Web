import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ResponsibleRepresentativesTable() {
  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="bg-[#eaeaea] h-[50px]">
          <TableHead className="w-[4%] text-lg text-[#717171] rounded-tl-lg rounded-bl-lg">
            T/r:
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[14%]">Ismi</TableHead>
          <TableHead className="text-[#717171] text-lg w-[14%]">
            Familiyasi
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[14%]">
            Tashkilot nomi
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[14%]">
            Millati
          </TableHead>
          <TableHead className="text-[#717171] text-lg w-[14%]">
            Ma’lumoti
          </TableHead>
          <TableHead className="text-right text-[#717171] text-lg rounded-tr-lg rounded-br-lg w-[14%]">
            Lavozimi
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="h-[50px]">
          <TableCell className="w-[4%] text-lg font-[300]">321</TableCell>
          <TableCell className="w-[14%] text-base font-[300]">
            Amirjon
          </TableCell>
          <TableCell className="w-[14%] text-base font-[300]">
            Yuldashev
          </TableCell>
          <TableCell className="w-[14%] text-base font-[300]">
            Urmontexnoservis davlat unitar korxonasi
          </TableCell>
          <TableCell className="w-[14%] text-base font-[300]">O’zbek</TableCell>
          <TableCell className="w-[14%] text-base font-[300]">Oliy</TableCell>
          <TableCell className="w-[14%] text-right text-base font-[400]">
            Bosh mutaxassis
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export default ResponsibleRepresentativesTable;
