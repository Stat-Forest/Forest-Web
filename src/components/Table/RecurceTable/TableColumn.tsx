import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function TableColumn({ data }: any) {
  console.log(data);
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-3">T/R</TableHead>
            {data.map((item: any) => (
              <TableHead className="min-w-[200px] text-left">
                <div className="px-4">{item?.title}</div>
                {item?.children.length > 0 ? (
                  <TableRow>
                    {item?.children.map((child: any) => (
                      <>
                        <TableHead className="min-w-[100px]">
                          {child?.title}
                        </TableHead>
                        {child?.children.length > 0 ? (
                          <TableRow>
                            {child?.children.map((sup_child: any) => (
                              <>
                                <TableHead className="min-w-[100px]">
                                  {sup_child?.title}
                                </TableHead>
                              </>
                            ))}
                          </TableRow>
                        ) : (
                          <></>
                        )}
                      </>
                    ))}
                  </TableRow>
                ) : (
                  <></>
                )}
              </TableHead>
            ))}
            <TableHead className="px-3">Amallar</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    </div>
  );
}

export default TableColumn;
