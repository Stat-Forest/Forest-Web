"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableHeadCell } from "./TableHeadCell";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

function TableColumn({ data = [], rows = [] }: any) {
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto">
      <Table className="">
        <TableHeader>
          <TableRow>
            <TableHead className="px-3 w-[50px] border-1 border-[black]">
              T/R
            </TableHead>
            {data.map((item: any) => (
              <TableHeadCell key={item.id} item={item} />
            ))}
            <TableHead className="px-3 min-w-[120px] max-w-[120px] border-1 border-[black]">
              Amallar
            </TableHead>
          </TableRow>
        </TableHeader>
      </Table>
      <TableBody>
        {rows.map((row: any, rowIndex: number) => (
          <TableRow key={rowIndex}>
            <TableCell className="px-3 min-w-[52px] border-1 border-[black]">
              {rowIndex + 1}
            </TableCell>
            {row?.report_items.map((col: any, colIndex: number) => (
              <TableCell
                key={colIndex}
                className="px-3 min-w-[401px] max-w-[400px] border-1 border-[black] text-center"
              >
                {col.value ?? "-"}
              </TableCell>
            ))}
            <TableCell className="px-3 min-w-[120px] max-w-[120px] border-1 border-[black] flex items-center gap-4">
              <Button
                className="bg-[#09B86F] hover:bg-[#09B86F]"
                onClick={() =>
                  navigate(`/resource-management/update/${row?.id}`)
                }
              >
                <Edit2 />
              </Button>
              <Button
                className="bg-[#09B86F] hover:bg-[#09B86F]"
                onClick={() => console.log(row.id)}
              >
                <Trash2 />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </div>
  );
}

export default TableColumn;
