import { TableHead, TableRow } from "@/components/ui/table";

export function TableHeadCell({ item }: { item: any }) {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <TableHead
      colSpan={hasChildren ? item.children.length : 1}
      rowSpan={hasChildren ? 1 : 2}
      className="text-left border-[0.5] border-[black]"
    >
      <div className="px-3 text-center min-w-[393.05px] max-w-[400px]">
        {item.title}
      </div>
      {hasChildren && (
        <TableRow>
          {item.children.map((child: any) => (
            <TableHeadCell key={child.id} item={child} />
          ))}
        </TableRow>
      )}
    </TableHead>
  );
}
