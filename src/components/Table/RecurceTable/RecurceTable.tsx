import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function RecurceTable() {
  return (
    <div className="bg-white px-5 py-3 my-3 shadow rounded-2xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={3}>T/r</TableHead>
            <TableHead rowSpan={3}>Tashkilot nomi</TableHead>
            <TableHead rowSpan={3} className="text-center">
              Jami xodimlar soni
            </TableHead>
            <TableHead colSpan={5} className="text-center">
              Shundan:
            </TableHead>
            <TableHead rowSpan={3} className="text-center">
              Jami vakant lavozimlar soni
            </TableHead>
            <TableHead colSpan={6} className="text-center">
              Shundan:
            </TableHead>
          </TableRow>
          <TableRow>
            <TableHead rowSpan={2}>Boshqaruv xodimlari</TableHead>
            <TableHead rowSpan={2}>Mutaxassislar</TableHead>
            <TableHead rowSpan={2}>Ishlab chiqarish xodimlari</TableHead>
            <TableHead rowSpan={2}>Texnik xodimlar</TableHead>
            <TableHead rowSpan={2}>Xizmat ko‘rsatuvchi xodimlar</TableHead>
            <TableHead rowSpan={2}>Boshqaruv xodimlari</TableHead>
            <TableHead rowSpan={2}>Mutaxassislar</TableHead>
            <TableHead rowSpan={2}>Ishlab chiqarish xodimlari</TableHead>
            <TableHead rowSpan={2}>Texnik xodimlar</TableHead>
            <TableHead rowSpan={2}>Xizmat ko‘rsatuvchi xodimlar</TableHead>
            <TableHead rowSpan={2}>Ishchilar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>1</TableCell>
            <TableCell>Yoshlar ishlari agentligi</TableCell>
            <TableCell>150</TableCell>
            <TableCell>5</TableCell>
            <TableCell>40</TableCell>
            <TableCell>60</TableCell>
            <TableCell>20</TableCell>
            <TableCell>10</TableCell>
            <TableCell>15</TableCell>
            <TableCell>2</TableCell>
            <TableCell>4</TableCell>
            <TableCell>5</TableCell>
            <TableCell>2</TableCell>
            <TableCell>1</TableCell>
            <TableCell>1</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default RecurceTable;
