import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { base_url } from "@/services/baseUrl";
import { useGetStatementColumnsReportQuery } from "@/services/reportsApi";
import { useGetInformationAnalyticalQuery } from "@/services/informationAnalyticalApi";
import { ReportColumn } from "@/types/reportInterface";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectTrigger, SelectItem, SelectValue, SelectContent } from "@/components/ui/select";
import { regions_information } from "@/services/constants";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { decryptData } from "@/utils/crypto";

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

  const handleDownloadReport = async () => {
    try {
      const params = new URLSearchParams();
      if (lang) params.append("lang", lang);
      if (selectedRegion) params.append("region", selectedRegion);
      if (selectedOrganization) params.append("organization", selectedOrganization);
      if (period) params.append("period", period);

      const token = decryptData("token", "token") as string | null;
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${base_url}/information-analytical/export-excel/${params.toString() ? `?${params.toString()}` : ""}`,
        {
          method: "GET",
          headers,
        },
      );

      if (!response.ok) {
        throw new Error("Failed to download report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "forest-monitoring.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download report:", error);
    }
  };

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
    <div className="py-3 space-y-4">
      <div className="w-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 rounded-2xl p-4 shadow-xs backdrop-blur-md transition-colors flex items-center flex-wrap gap-3">
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-full md:w-[220px] text-xs sm:text-sm h-[40px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl">
            <SelectValue placeholder="Hududni tanlang" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
           {regions_information.map((region) => (
              <SelectItem key={region.value} value={region.value} className="dark:text-slate-100">
                {region.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
          <SelectTrigger className="w-full md:w-[260px] text-xs sm:text-sm h-[40px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl">
            <SelectValue placeholder="Tashkilotni tanlang" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
            {organizationData?.map((org: any) => (
              <SelectItem key={org.id} value={org.id} className="dark:text-slate-100">
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
            className="w-full md:w-[320px] text-xs sm:text-sm h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:!bg-slate-800 dark:!text-slate-100 px-3 transition-colors"
          />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Formatlar: Yillik: 2025 | Choraklik: 2025-CHORAK_1 | Oylik: 2025-01
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="h-[40px] px-4 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95"
            onClick={() => {
              setSelectedRegion("");
              setSelectedOrganization("");
              setPeriod("");
            }}
          >
            Tozalash
          </button>
          <button
            className="h-[40px] px-4 font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95"
            onClick={handleDownloadReport}
          >
            Hisobotni yuklab olish
          </button>
        </div>
      </div>

      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs backdrop-blur-md transition-colors overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold">
            {headerRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {rowIndex === 0 && (
                  <>
                    <th
                      className="border border-slate-300 dark:border-slate-700 px-2 py-2 text-center font-bold"
                      rowSpan={maxDepth}
                    >
                      №
                    </th>
                    <th
                      className="border border-slate-300 dark:border-slate-700 px-2 py-2 text-center font-bold min-w-[180px]"
                      rowSpan={maxDepth}
                    >
                      Hudud
                    </th>
                  </>
                )}
                {row.map((cell, cellIndex) => (
                  <th
                    key={cellIndex}
                    className="border border-slate-300 dark:border-slate-700 px-2 py-2 text-center font-bold min-w-[120px]"
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                  >
                    {cell.title}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="text-xs text-slate-800 dark:text-slate-100">
            {tableRows.map((row, rowIndex) => (
              <tr key={row.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-center">
                  {rowIndex + 1}
                </td>
                <td
                  className={`border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-left min-w-[180px] ${
                    row.hasChildren ? "font-bold" : ""
                  }`}
                >
                  {row.hudud}
                </td>
                {row.cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-center min-w-[120px]"
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
