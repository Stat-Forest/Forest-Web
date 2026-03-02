import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { useGetStatementColumnsReportQuery } from "@/services/reportsApi";
import { useGetInformationAnalyticalQuery } from "@/services/informationAnalyticalApi";
import { ReportColumn } from "@/types/reportInterface";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AnalyticalNode = {
  level?: string;
  hudud?: string;
  result?: Record<string, unknown> | null;
  children?: AnalyticalNode[] | unknown[];
};

type FlatRow = {
  level: string;
  hudud: string;
  result: Record<string, unknown> | null;
  depth: number;
  hasChildren: boolean;
};

/** Daraxtni tekis qatorlar ro'yxatiga yoyadi (har bir node = bitta qator) */
function flattenTree(node: AnalyticalNode | null, rows: FlatRow[] = [], depth = 0): FlatRow[] {
  if (!node) return rows;
  const children = Array.isArray(node.children) ? (node.children as AnalyticalNode[]) : [];
  rows.push({
    level: node.level ?? "",
    hudud: node.hudud ?? "",
    result: (node.result && typeof node.result === "object" ? node.result : null) as
      | Record<string, unknown>
      | null,
    depth,
    hasChildren: children.length > 0,
  });
  children.forEach((child) => flattenTree(child, rows, depth + 1));
  return rows;
}

/** Bitta qiymatni jadval katakka ko'rsatish uchun matnga aylantiradi */
function formatCellValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "-";
  if (typeof val === "string") return val;
  if (typeof val !== "object") return String(val);
  const o = val as Record<string, unknown>;
  const reja = o.Reja;
  const amalda = o.Amalda;
  const pct = o["%"];
  const diff = o["(+,-)"];
  if (
    "Reja" in o ||
    "Amalda" in o ||
    "%" in o ||
    "(+,-)" in o
  ) {
    const parts = [
      reja !== undefined && reja !== "" ? `Reja: ${reja}` : null,
      amalda !== undefined && amalda !== "" ? `Amalda: ${amalda}` : null,
      pct !== undefined && pct !== "" ? `%: ${pct}` : null,
      diff !== undefined && diff !== "" ? `(+,-): ${diff}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" | ") : "-";
  }
  const keys = Object.keys(o);
  if (keys.length === 0) return "-";
  const parts = keys.map((k) => {
    const v = o[k];
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      return `${k}: ${formatCellValue(v)}`;
    }
    return `${k}: ${v ?? "-"}`;
  });
  return parts.join(" | ");
}

/** result obyektida berilgan kalit bo'yicha rekursiv qidiradi */
function findValueByKeyRecursive(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(record, key)) {
    return record[key];
  }

  for (const k of Object.keys(record)) {
    const v = record[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const found = findValueByKeyRecursive(v, key);
      if (found !== undefined) return found;
    }
  }

  return undefined;
}

function getLeafColumnTitles(nodes: ReportColumn[]): string[] {
  const titles: string[] = [];
  nodes.forEach((node) => {
    if (!node.children || node.children.length === 0) {
      titles.push(node.title);
    } else {
      titles.push(...getLeafColumnTitles(node.children));
    }
  });
  return titles;
}

function getMaxDepth(items: ReportColumn[]): number {
  return items.reduce((max, item) => {
    if (item.children && item.children.length > 0) {
      return Math.max(max, 1 + getMaxDepth(item.children));
    }
    return Math.max(max, 1);
  }, 0);
}

function getColSpan(item: ReportColumn): number {
  if (!item.children || item.children.length === 0) return 1;
  return item.children.reduce((sum, child) => sum + getColSpan(child), 0);
}

function renderHeaderRows(data: ReportColumn[], maxDepth: number) {
  const rows: { title: string; colSpan: number; rowSpan: number }[][] = [];

  const traverse = (items: ReportColumn[], depth: number, rowIndex: number) => {
    if (!rows[rowIndex]) rows[rowIndex] = [];

    items.forEach((item) => {
      const hasChildren = item.children && item.children.length > 0;
      rows[rowIndex].push({
        title: item.title,
        colSpan: hasChildren ? getColSpan(item) : 1,
        rowSpan: hasChildren ? 1 : maxDepth - depth + 1,
      });
      if (hasChildren && item.children) {
        traverse(item.children, depth + 1, rowIndex + 1);
      }
    });
  };

  traverse(data, 1, 0);
  return rows;
}

function ForestAnalysisContainer({ reportName: _reportName }: { reportName: string }) {
  const { id } = useParams<{ id: string }>();
  const lang = useSelector((state: RootState) => state.language.lang);

  const {
    data: tableHeadersData = [],
    isLoading: isHeadersLoading,
    isError: isErrorHeaders,
  } = useGetStatementColumnsReportQuery(
    { statementId: id || "", lang, isUser: "" },
    { skip: !id },
  );

  const {
    data: analyticalData,
    isLoading: isBodyLoading,
    isError: isErrorBody,
  } = useGetInformationAnalyticalQuery(
    id ? { statement: id } : undefined,
    { skip: !id },
  );

  const isLoading = isHeadersLoading || isBodyLoading;
  const isError = isErrorHeaders || isErrorBody;

  const firstTabColumns = useMemo(() => {
    const first = tableHeadersData[0];
    if (!first?.children?.length) return [];
    return first.children;
  }, [tableHeadersData]);

  const leafTitles = useMemo(
    () => getLeafColumnTitles(firstTabColumns),
    [firstTabColumns],
  );

  const maxDepth = useMemo(
    () => getMaxDepth(firstTabColumns),
    [firstTabColumns],
  );

  const headerRows = useMemo(
    () => renderHeaderRows(firstTabColumns, maxDepth),
    [firstTabColumns, maxDepth],
  );

  const tableRows = useMemo(() => {
    let root: AnalyticalNode | null = null;

    if (analyticalData && typeof analyticalData === "object") {
      const anyData = analyticalData as any;

      if (Array.isArray(anyData.results) && anyData.results.length > 0) {
        root = anyData.results[0] as AnalyticalNode;
      } else if (!Array.isArray(analyticalData)) {
        root = analyticalData as AnalyticalNode;
      }
    }

    const flatRows = flattenTree(root);
    return flatRows.map((row, index) => {
      const cells = leafTitles.map((colTitle) => {
        const val = findValueByKeyRecursive(row.result, colTitle);
        return formatCellValue(val);
      });
      return {
        id: `row-${index}-${row.hudud}`,
        hudud: row.hudud,
        depth: row.depth,
        hasChildren: row.hasChildren,
        cells,
      };
    });
  }, [analyticalData, leafTitles]);

  if (isLoading) {
    return (
      <div className="py-3 space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Alert variant="destructive">
          <AlertTitle>Xatolik yuz berdi</AlertTitle>
          <AlertDescription>Ma&apos;lumotlarni yuklashda xatolik. Qayta urinib ko&apos;ring.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="overflow-x-auto bg-ice p-4 rounded-xl">
        <table className="w-full border-collapse">
          <thead className="w-full">
            {headerRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {rowIndex === 0 && (
                  <>
                    <th
                      className="border border-black px-2 py-1 text-center bg-[#f8f9fa] font-bold"
                      rowSpan={maxDepth}
                    >
                      №
                    </th>
                    <th
                      className="border border-black px-2 py-1 text-center bg-[#f8f9fa] font-bold min-w-[180px]"
                      rowSpan={maxDepth}
                    >
                      Hudud
                    </th>
                  </>
                )}
                {row.map((cell, cellIndex) => (
                  <th
                    key={cellIndex}
                    className="border border-black px-2 py-1 text-center bg-[#f8f9fa] font-bold min-w-[120px]"
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                  >
                    {cell.title}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableRows.map((row, rowIndex) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="border border-black px-2 py-1 text-center">
                  {rowIndex + 1}
                </td>
                <td
                  className={`border border-black px-2 py-1 text-left min-w-[180px] ${
                    row.hasChildren ? "font-bold" : ""
                  }`}
                >
                  {row.hudud}
                </td>
                {row.cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border border-black px-2 py-1 text-center min-w-[120px]"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ForestAnalysisContainer;
