import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function NewsletterTable() {
  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="bg-[#eaeaea] h-[50px]">
          <TableHead className="w-[4%] text-lg text-[#717171] border-none rounded-tl-lg rounded-bl-lg">
            T/r:
          </TableHead>
          <TableHead className="text-[#717171] border-none text-lg w-[20%]">
            Hisobot nomi
          </TableHead>
          <TableHead className="text-[#717171] border-none text-lg w-[20%]">
            Hisobot davri
          </TableHead>
          <TableHead className="text-[#717171] border-none text-lg w-[20%]">
            Hisobot topshirish vahti
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="h-[50px]">
          <TableCell className="w-[4%] text-lg font-[300] border-none">1</TableCell>
          <TableCell className="w-[25%] text-base font-[300] border-none">
            Hodimlar hisobi
          </TableCell>
          <TableCell className="w-[20%] text-base font-[300] border-none">Chorak</TableCell>
          <TableCell className="w-[35%] text-base font-[300] border-none">
            Chorak yakunidagi keyingi oyning 5 sanasigacha
          </TableCell>
        </TableRow>
        <TableRow className="h-[50px]">
          <TableCell className="w-[4%] text-lg font-[300] border-none">1</TableCell>
          <TableCell className="w-[25%] text-base font-[300] border-none">
            Hodimlar hisobi
          </TableCell>
          <TableCell className="w-[20%] text-base font-[300] border-none">Chorak</TableCell>
          <TableCell className="w-[35%] text-base font-[300] border-none">
            Chorak yakunidagi keyingi oyning 5 sanasigacha
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export default NewsletterTable;
