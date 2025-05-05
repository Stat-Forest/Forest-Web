import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function NewsletterTable({ data }: any) {
  const [openRowIndex, setOpenRowIndex] = useState<number | null>(null);

  const toggleRow = (index: number) => {
    setOpenRowIndex(prev => (prev === index ? null : index));
  };

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
        {data?.results?.map((item: any, index: number) => (
          <React.Fragment key={index}>
            <TableRow
              className="h-[50px] cursor-pointer hover:bg-gray-100"
              onClick={() => toggleRow(index)}
            >
              <TableCell className="text-lg font-[300] border-none">
                {index + 1}
              </TableCell>
              <TableCell className="text-base font-[300] border-none">
                {item?.statement?.name}
              </TableCell>
              <TableCell className="text-base font-[300] border-none">
                {item?.statement?.period}
              </TableCell>
              <TableCell className="text-base font-[300] border-none">
                {item?.submit_at}
              </TableCell>
            </TableRow>

            {openRowIndex === index && (
              <TableRow className="bg-gray-50">
                <TableCell colSpan={4} className="border-t p-4">
                  <div>
                    <h4 className="font-semibold mb-2">Tashkilotlar:</h4>
                    <ul className="list-disc ml-5 space-y-1">
                      {item.organizations?.length > 0 ? (
                        item.organizations.map((org: any, idx: number) => (
                          <li key={idx}>
                            {org.name}
                          </li>
                        ))
                      ) : (
                        <p className="text-gray-500">Tashkilotlar yo'q</p>
                      )}
                    </ul>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

export default NewsletterTable;
