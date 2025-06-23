export function generateHeaderRows(
  data: any[],
  level = 0,
  result: any[][] = []
) {
  result[level] = result[level] || [];

  for (const item of data) {
    const hasChildren = item.children && item.children.length > 0;
    const colSpan = hasChildren ? getLeafCount(item) : 1;
    const rowSpan = hasChildren ? 1 : getMaxDepth(data) - level;

    result[level].push({
      id: item.id,
      title: item.title,
      colSpan,
      rowSpan,
    });

    if (hasChildren) {
      generateHeaderRows(item.children, level + 1, result);
    }
  }

  return result;
}

function getLeafCount(item: any): number {
  if (!item.children || item.children.length === 0) return 1;
  return item.children.reduce(
    (sum: number, child: any) => sum + getLeafCount(child),
    0
  );
}

function getMaxDepth(data: any[]): number {
  return data.reduce((max, item) => {
    const depth = item.children ? getMaxDepth(item.children) + 1 : 1;
    return Math.max(max, depth);
  }, 0);
}
