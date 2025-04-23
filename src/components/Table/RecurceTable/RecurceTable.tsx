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
            <TableCell>5</TableCell> {/* Boshqaruv xodimlari */}
            <TableCell>40</TableCell> {/* Mutaxassislar */}
            <TableCell>60</TableCell> {/* Ishlab chiqarish xodimlari */}
            <TableCell>20</TableCell> {/* Texnik xodimlar */}
            <TableCell>10</TableCell> {/* Xizmat ko‘rsatuvchi xodimlar */}
            <TableCell>15</TableCell> {/* Jami vakant lavozimlar */}
            <TableCell>2</TableCell> {/* Boshqaruv vakant */}
            <TableCell>4</TableCell> {/* Mutaxassis vakant */}
            <TableCell>5</TableCell> {/* Ishlab chiqarish vakant */}
            <TableCell>2</TableCell> {/* Texnik vakant */}
            <TableCell>1</TableCell> {/* Xizmat ko‘rsatuvchi vakant */}
            <TableCell>1</TableCell> {/* Ishchilar vakant */}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default RecurceTable;
