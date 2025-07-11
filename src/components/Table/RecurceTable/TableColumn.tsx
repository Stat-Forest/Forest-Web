// TableColumn.tsx
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { forwardRef, useImperativeHandle, useRef } from "react";

const TableColumn = forwardRef(
  (
    { data = [], rows = [], onRowClick, selectedRow, userCheckTable }: any,
    ref
  ) => {
    const tableRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useImperativeHandle(ref, () => ({
      getTable: () => tableRef.current?.innerHTML,
    }));

    const getMaxDepth = (items: any[]): number => {
      return items.reduce((max: number, item: any) => {
        if (item.children && item.children.length > 0) {
          return Math.max(max, 1 + getMaxDepth(item.children));
        }
        return Math.max(max, 1);
      }, 0);
    };

    const maxDepth = getMaxDepth(data);

    const renderHeaderRows = () => {
      const rows: any[] = [];

      const traverse = (items: any[], depth: number, rowIndex: number) => {
        if (!rows[rowIndex]) rows[rowIndex] = [];

        items.forEach((item: any) => {
          const hasChildren = item.children && item.children.length > 0;

          rows[rowIndex].push({
            title: item.title,
            colSpan: hasChildren ? getColSpan(item) : 1,
            rowSpan: hasChildren ? 1 : maxDepth - depth + 1,
          });

          if (hasChildren) {
            traverse(item.children, depth + 1, rowIndex + 1);
          }
        });
      };

      traverse(data, 1, 0);

      return rows;
    };

    const getColSpan = (item: any): number => {
      if (!item.children || item.children.length === 0) return 1;
      return item.children.reduce(
        (sum: number, child: any) => sum + getColSpan(child),
        0
      );
    };

    const headerRows = renderHeaderRows();

    return (
      <>
        <div className="overflow-x-auto" ref={tableRef} id="printableTable">
          <table className="w-full border-collapse">
            <thead className="w-full">
              {headerRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {rowIndex === 0 && (
                    <th
                      className="border border-black px-2 py-1 text-center"
                      rowSpan={maxDepth}
                    >
                      T/R
                    </th>
                  )}
                  {row.map((cell: any, cellIndex: number) => (
                    <th
                      key={cellIndex}
                      className="border w-[400px] border-black px-2 py-1 text-center"
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                    >
                      {cell.title}
                    </th>
                  ))}
                  {rowIndex === 0 && (
                    <th
                      className="border border-black px-2 py-1 text-center"
                      rowSpan={maxDepth}
                    >
                      Amallar
                    </th>
                  )}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row: any, rowIndex: number) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row)}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <td className="border border-black px-2 py-1 text-center">
                    {rowIndex + 1}
                  </td>
                  {row.report_items.map((col: any, colIndex: number) => (
                    <td
                      key={colIndex}
                      className="border min-w-[380px] border-black px-2 py-1 text-center"
                    >
                      {col?.plant_values[0].value ?? "-"}
                    </td>
                  ))}
                  <td className="border border-black px-2 py-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        className="bg-[#09B86F] hover:bg-[#09B86F]"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/resource-management/update/${row?.id}`);
                        }}
                      >
                        <Edit2 />
                      </Button>
                      <Button
                        className="bg-[#09B86F] hover:bg-[#09B86F]"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log(row.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {userCheckTable && selectedRow && (
          <div className="mt-6 border border-black overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="w-full">
                {headerRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {rowIndex === 0 && (
                      <th
                        className="border border-black px-2 py-1 text-center"
                        rowSpan={maxDepth}
                      >
                        T/R
                      </th>
                    )}
                    {row.map((cell: any, cellIndex: number) => (
                      <th
                        key={cellIndex}
                        className="border w-[400px] border-black px-2 py-1 text-center"
                        colSpan={cell.colSpan}
                        rowSpan={cell.rowSpan}
                      >
                        {cell.title}
                      </th>
                    ))}
                    {rowIndex === 0 && (
                      <th
                        className="border border-black px-2 py-1 text-center"
                        rowSpan={maxDepth}
                      >
                        Amallar
                      </th>
                    )}
                  </tr>
                ))}
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-1 text-center">
                    1
                  </td>
                  {selectedRow.report_items.map(
                    (col: any, colIndex: number) => (
                      <td
                        key={colIndex}
                        className="border min-w-[380px] min-h-[60px] border-black px-2 py-3 text-center"
                      >
                        {col.value ?? "-"}
                      </td>
                    )
                  )}
                  <td className="border border-black px-2 py-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        className="bg-[#09B86F] hover:bg-[#09B86F]"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            `/resource-management/update/${selectedRow?.id}`
                          );
                        }}
                      >
                        <Edit2 />
                      </Button>
                      <Button
                        className="bg-[#09B86F] hover:bg-[#09B86F]"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log(selectedRow.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }
);

export default TableColumn;
