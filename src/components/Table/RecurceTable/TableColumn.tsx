import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function TableHeadCell({ item }: { item: any }) {
  return (
    <TableHead className="min-w-[150px] text-left">
      <div className="px-3">{item.title}</div>
      {item?.children?.length > 0 && (
        <TableRow>
          {item.children.map((child: any, index: number) => (
            <TableHeadCell key={index} item={child} />
          ))}
        </TableRow>
      )}
    </TableHead>
  );
}

function TableColumn({ data }: { data: any[] }) {
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-3">T/R</TableHead>
            {data.map((item, index) => (
              <TableHeadCell key={index} item={item} />
            ))}
            <TableHead className="px-3">Amallar</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    </div>
  );
}

export default TableColumn;
