// utils/findEmptyChildrenColumnIds.ts faylini yangilash
export function findEmptyChildrenColumnIds(
  children: any[],
): {
  id: string;
  title: string;
  fullParentChain: string;
  is_organization?: boolean;
  status_plan?: any;
}[] {
  const result: {
    id: string;
    title: string;
    fullParentChain: string;
    is_organization?: boolean;
    status_plan?: any;
  }[] = [];

  const traverse = (cols: any[], parentChain: string[] = []) => {
    cols.forEach((col) => {
      const currentChain = [...parentChain, col.title];
      if (
        col.children &&
        Array.isArray(col.children) &&
        col.children.length > 0
      ) {
        traverse(col.children, currentChain);
      } else {
        result.push({
          id: col.id,
          title: col.title,
          fullParentChain: currentChain.join(" / "),
          is_organization: col.is_organization ?? false,
          status_plan: col.status_plan ?? null,
        });
      }
    });
  };

  traverse(children);
  return result;
}
