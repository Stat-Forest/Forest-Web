export function findEmptyChildrenColumnIds(
  columns: any[],
  rows: any[]
): { id: string; title: string }[] {
  let result: { id: string; title: string }[] = [];

  columns.forEach((col) => {
    const isEmpty = rows.every((row) =>
      row.report_items.every(
        (item: any) => item.column_id !== col.id || item.value == null
      )
    );

    if (isEmpty) {
      result.push({ id: col.id, title: col.title });
    }

    if (Array.isArray(col.children) && col.children.length > 0) {
      result = result.concat(findEmptyChildrenColumnIds(col.children, rows));
    }
  });

  return result;
}
