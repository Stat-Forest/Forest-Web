import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { useGetStatementColumnsReportQuery } from "@/services/reportsApi";
import { useGetInformationAnalyticalQuery } from "@/services/informationAnalyticalApi";
import { ReportColumn } from "@/types/reportInterface";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectTrigger, SelectItem, SelectValue, SelectContent } from "@/components/ui/select";
import { regions_information } from "@/services/constants";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";

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
function flattenTree(
  node: AnalyticalNode | null,
  rows: FlatRow[] = [],
  depth = 0,
): FlatRow[] {
  if (!node) return rows;
  const children = Array.isArray(node.children)
    ? (node.children as AnalyticalNode[])
    : [];
  rows.push({
    level: node.level ?? "",
    hudud: node.hudud ?? "",
    result: (node.result && typeof node.result === "object"
      ? node.result
      : null) as Record<string, unknown> | null,
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
  if ("Reja" in o || "Amalda" in o || "%" in o || "(+,-)" in o) {
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

/**
 * Statement-columns va analytical API kalitlarini solishtirish uchun normalizatsiya.
 * Turli apostrof/unicode belgilari (masalan O'rmon) bir xil qilib qaytariladi.
 */
function normalizeKeyForMatch(s: string): string {
  return s
    .trim()
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2033]/g, "'") // Unicode apostrof/tirnoq -> ASCII
    .replace(/\s+/g, " ");
}


/** Har bir leaf ustun uchun root dan leaf gacha bo‘lgan title yo‘lini qaytaradi (children bo‘yicha) */
function getLeafColumnPaths(nodes: ReportColumn[], parentPath: string[] = []): string[][] {
  const paths: string[][] = [];
  nodes.forEach((node) => {
    const path = [...parentPath, node.title];
    if (!node.children || node.children.length === 0) {
      paths.push(path);
    } else {
      paths.push(...getLeafColumnPaths(node.children, path));
    }
  });
  return paths;
}

/** result obyektida berilgan yo‘l (parent → child → …) bo‘yicha qiymatni qaytaradi; kalitlar normalizatsiyalangan */
function getValueByPath(obj: unknown, path: string[]): unknown {
  if (path.length === 0) return obj;
  if (!obj || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  const keyNorm = normalizeKeyForMatch(path[0]);
  let key: string | null = null;
  if (Object.prototype.hasOwnProperty.call(record, path[0])) key = path[0];
  else {
    for (const k of Object.keys(record)) {
      if (normalizeKeyForMatch(k) === keyNorm) {
        key = k;
        break;
      }
    }
  }
  if (key === null) return undefined;
  return getValueByPath(record[key], path.slice(1));
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

function ForestAnalysisContainer({
  reportName: _reportName,
}: {
  reportName: string;
}) {
  const { id } = useParams<{ id: string }>();
  const lang = useSelector((state: RootState) => state.language.lang);

  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");
  const [period, setPeriod] = useState<string>("");

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
  } = useGetInformationAnalyticalQuery({
    lang,
    region: selectedRegion,
    organization: selectedOrganization,
    period,
  });

  const {data: organizationData} = useGetOrganizationReportsQuery({lang});

  const isLoading = isHeadersLoading || isBodyLoading;
  const isError = isErrorHeaders || isErrorBody;

  const firstTabColumns = useMemo(() => {
    const first = tableHeadersData[0];
    if (first?.children?.length) return first.children;
    // Agar birinchi elementda children bo‘lmasa, butun sarlavhalarni ustunlar deb ol (bitta daraja)
    if (Array.isArray(tableHeadersData) && tableHeadersData.length > 0) return tableHeadersData;
    return [];
  }, [tableHeadersData]);

  /** Har bir ustun uchun root→leaf yo‘li (children ierarxiyasi bo‘yicha) — qiymatni to‘g‘ri joyga qo‘yish uchun */
  const leafPaths = useMemo(
    () => getLeafColumnPaths(firstTabColumns),
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
    const flatRows: FlatRow[] = [];

    if (analyticalData && typeof analyticalData === "object") {
      const anyData = analyticalData as any;

      if (Array.isArray(anyData.results) && anyData.results.length > 0) {
        (anyData.results as AnalyticalNode[]).forEach((node) => {
          flattenTree(node, flatRows);
        });
      } else if (Array.isArray(analyticalData)) {
        (analyticalData as AnalyticalNode[]).forEach((node) => {
          flattenTree(node, flatRows);
        });
      } else {
        flattenTree(analyticalData as AnalyticalNode, flatRows);
      }
    }

    const rootTitle = tableHeadersData[0]?.title;

    return flatRows.map((row, index) => {
      const cells = leafPaths.map((path) => {
        let val = getValueByPath(row.result, path);
        if (val === undefined && rootTitle) {
          val = getValueByPath(row.result, [rootTitle, ...path]);
        }
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
  }, [analyticalData, leafPaths, tableHeadersData]);

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
          <AlertDescription>
            Ma&apos;lumotlarni yuklashda xatolik. Qayta urinib ko&apos;ring.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className=" m-1 rounded-2xl p-3 bg-white flex items-start gap-4 ">
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-full min-w-[300px] max-w-48">
            <SelectValue placeholder="Hududni tanlang" />
          </SelectTrigger>
          <SelectContent>
           {regions_information.map((region) => (
              <SelectItem key={region.value} value={region.value}>
                {region.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
          <SelectTrigger className="w-full min-w-[300px] max-w-48">
            <SelectValue placeholder="Tashkilotni tanlang" />
          </SelectTrigger>
          <SelectContent>
            {organizationData?.map((org: any) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-col gap-1">
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="Hisobot davri (masalan: 2025, 2025-CHORAK_1, 2025-01)"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[260px] max-w-64"
          />
          <span className="text-[12px] text-gray-500">
            Formatlar: Yillik: 2025 | <br /> Choraklik: 2025-CHORAK_1 | <br /> Oylik: 2025-01
          </span>
        </div>
        <button
          className="bg-blue-400 text-white py-2 px-3 text-sm rounded-lg"
          onClick={() => {
            setSelectedRegion("");
            setSelectedOrganization("");
            setPeriod("");
          }}
        >
          Tozalash
        </button>
      </div>
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
