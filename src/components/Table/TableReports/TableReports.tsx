import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function TableReports() {
  const status = "Qabul qilingan";
  return (
      <Table className="w-full">
        <TableHeader>
          <TableRow className="bg-[#eaeaea] h-[50px]">
            <TableHead className="w-[20%] text-lg text-[#717171] rounded-tl-lg rounded-bl-lg">
              Tashkilot nomi
            </TableHead>
            <TableHead className="text-[#717171] text-lg w-[20%]">
              Hisobot nomi
            </TableHead>
            <TableHead className="text-[#717171] text-lg w-[20%]">
              Hisobot davri
            </TableHead>
            <TableHead className="text-[#717171] text-lg w-[20%]">
              Topshirilgan muddati
            </TableHead>
            <TableHead className="text-right text-[#717171] text-lg rounded-tr-lg rounded-br-lg w-[20%]">
              Joriy holati
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="h-[50px]">
            <TableCell className="w-[20%] text-lg font-[300]">
              Urmontexnoservis
            </TableCell>
            <TableCell className="w-[20%] text-base font-[300]">
              1 mehnat shakli
            </TableCell>
            <TableCell className="w-[20%] text-base font-[300]">
              Yillik
            </TableCell>
            <TableCell className="w-[20%] text-base font-[300]">
              2025-01-01
            </TableCell>
            <TableCell className="text-right text-base font-[400]">
              <span
                className={`px-4 py-1 rounded-full ${
                  status === "Qabul qilingan"
                    ? "bg-[#7fa1f84f] text-[#4579FF]"
                    : status === "hello"
                    ? "bg-[#f9695c74] text-[#FF5445]"
                    : "bg-[#fcc7544a] text-[#fd9c15]"
                }`}
              >
                Qabul qilingan
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
  );
}

export default TableReports;
