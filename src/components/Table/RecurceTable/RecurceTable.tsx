import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function RecurceTable() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<Record<string, any>[]>([]);

  const keyNames = [
    "t_r",
    "tashkilot_nomi",
    "jami_xodimlar",
    "boshqaruv_xodimlari",
    "mutaxassislar",
    "ishlab_chiqarish_xodimlari",
    "texnik_xodimlar",
    "xizmat_korsatuvchilar",
    "vakant_boshqaruv",
    "vakant_mutaxassis",
    "vakant_ishlabchiqarish",
    "vakant_texnik",
    "vakant_xizmat",
    "vakant_ishchilar",
  ];

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      const rows = raw.slice(1);

      const result = rows.map((row) => {
        const item: Record<string, any> = {};
        keyNames.forEach((key, idx) => {
          item[key] = row[idx] ?? null;
        });
        return item;
      });

      setData(result); // 🔁 Jadvalda ko‘rsatish uchun state ga joylaymiz

      // 📡 Backendga yuborish
      // fetch("/api/xisobot", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(result),
      // })
        // .then((res) => {
        //   if (!res.ok) throw new Error("Yuborishda xatolik");
        //   return res.json();
        // })
        // .catch((err) => {
        //   console.error(err);
        //   alert("Xatolik yuz berdi!");
        // });
    };

    reader.readAsBinaryString(file);
  };

  console.log(data)

  const handleExport = () => {
    if (data.length === 0) return alert("Eksport qilish uchun ma'lumot yo‘q");

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hisobot");
    XLSX.writeFile(workbook, "hisobot.xlsx");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Button>Yangi xisobot</Button>
        <div className="flex gap-2">
          <Button onClick={() => fileInputRef.current?.click()}>Import</Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleExcelImport}
            className="hidden"
          />
          <Button onClick={handleExport}>Export</Button>
          <Button onClick={handlePrint}>Chop etish</Button>
        </div>
      </div>

      <div className="bg-white px-5 py-3 my-3 shadow rounded-2xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {keyNames.map((key) => (
                <TableHead key={key} className="text-xs">
                  {key.replace(/_/g, " ").toUpperCase()}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {keyNames.map((key) => (
                    <TableCell key={key}>{row[key]}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={keyNames.length} className="text-center">
                  Ma’lumot mavjud emas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default RecurceTable;
