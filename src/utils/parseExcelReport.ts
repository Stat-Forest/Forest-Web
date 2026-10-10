import type { WorkSheet } from "xlsx";

// SheetJS (~420 KB) faqat fayl o'qilganda yuklanadi (parseExcelBuffer ichida)
let XLSX: typeof import("xlsx");

/** Excel jadvalidagi bitta katak (merge ma'lumoti bilan) */
export interface ExcelGridCell {
  value: string;
  rowSpan: number;
  colSpan: number;
  isNumeric: boolean;
}

/** Excel jadvalidagi bitta qator */
export interface ExcelGridRow {
  cells: ExcelGridCell[];
  isHeader: boolean;
  isTotal: boolean;
}

/** Ma'lumot qatori: merge'lar yoyilgan holda, to'liq kenglikdagi kataklar */
export interface ExcelDataRow {
  cells: string[];
  isTotal: boolean;
}

/** Bitta varaq (sheet) — har bir ilova alohida varaqda bo'lishi mumkin */
export interface ParsedExcelSheet {
  name: string;
  // Excelda qanday bo'lsa, xuddi shunday ko'rsatish uchun merge'lari saqlangan jadval
  grid: ExcelGridRow[];
  columnCount: number;
  // Har bir ustun uchun sarlavha zanjiri (yuqoridan pastga, takrorlanmaydigan)
  headerChains: string[][];
  // Sarlavhadan keyingi qatorlar (merge'lar yoyilgan)
  dataRows: ExcelDataRow[];
}

export interface ParsedExcelReport {
  fileName: string;
  sheetNames: string[];
  rawRows: any[][];
  jsonData: Record<string, any>[];
  // Key-value lookup for quick matching: key can be "columnName" or "rowName_colName"
  valueMap: Record<string, string>;
  /** Fayldagi hamma varaq (bo'shlari ham) — import shular bo'yicha ishlaydi */
  sheets: ParsedExcelSheet[];
  // Quyidagilar — birinchi ma'lumotli varaq (eski kod bilan moslik uchun)
  grid: ExcelGridRow[];
  columnCount: number;
  headerChains: string[][];
  dataRows: ExcelDataRow[];
}

const isNumericValue = (val: string) => {
  if (!val) return false;
  const normalized = val.replace(/\s/g, "").replace(",", ".");
  return normalized !== "" && !isNaN(Number(normalized));
};

const TOTAL_ROW_KEYWORDS = ["jami", "итого", "всего", "jamí"];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuidString = (val: string): boolean => {
  if (!val) return false;
  return UUID_REGEX.test(val.trim());
};

const isHiddenOrUuidRow = (
  worksheet: WorkSheet,
  rowIndex: number,
  cells: ExcelGridCell[],
): boolean => {
  // 1. SheetJS row metadata (hidden=true yoki balandligi 1px dan kichik)
  const rowMeta = (worksheet as any)["!rows"]?.[rowIndex];
  if (rowMeta) {
    if (rowMeta.hidden === true) return true;
    if (typeof rowMeta.hpx === "number" && rowMeta.hpx < 1) return true;
    if (typeof rowMeta.hpt === "number" && rowMeta.hpt < 1) return true;
  }

  // 2. Ustun UUID lari qatori tekshiruvi (backend shablonidagi yashirin qator)
  const nonEmptyValues = cells
    .map((c) => c.value.trim())
    .filter((v) => v.length > 0);

  if (nonEmptyValues.length > 0) {
    const uuidCount = nonEmptyValues.filter((v) => isUuidString(v)).length;
    if (
      uuidCount === nonEmptyValues.length ||
      (uuidCount >= 2 && uuidCount / nonEmptyValues.length >= 0.5)
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Varaqni merge (birlashtirilgan kataklar) ma'lumoti bilan birga 2 o'lchamli
 * jadvalga aylantiradi — HTML jadvalda rowSpan/colSpan orqali aynan Exceldagidek
 * chizish uchun.
 */
const buildGrid = (
  worksheet: WorkSheet,
): {
  grid: ExcelGridRow[];
  columnCount: number;
  headerChains: string[][];
  dataRows: ExcelDataRow[];
} => {
  const empty = { grid: [], columnCount: 0, headerChains: [], dataRows: [] };

  const ref = worksheet["!ref"];
  if (!ref) return empty;

  const range = XLSX.utils.decode_range(ref);
  const merges = worksheet["!merges"] || [];

  // Merge'ning bosh katagi -> span, qolgan kataklar -> yashirin
  const spanMap = new Map<string, { rowSpan: number; colSpan: number }>();
  const coveredCells = new Set<string>();

  merges.forEach((m) => {
    const rowSpan = m.e.r - m.s.r + 1;
    const colSpan = m.e.c - m.s.c + 1;
    if (rowSpan <= 1 && colSpan <= 1) return;

    spanMap.set(`${m.s.r}:${m.s.c}`, { rowSpan, colSpan });
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) continue;
        coveredCells.add(`${r}:${c}`);
      }
    }
  });

  const readCell = (r: number, c: number): string => {
    const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
    if (!cell) return "";
    const raw = cell.w ?? cell.v;
    if (raw === undefined || raw === null) return "";
    return String(raw).trim();
  };

  // Haqiqatda ishlatilgan oxirgi ustunni aniqlaymiz (bo'sh ustunlarni tashlaymiz)
  let lastCol = range.s.c - 1;
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.e.c; c > lastCol; c--) {
      if (readCell(r, c) !== "" || coveredCells.has(`${r}:${c}`)) {
        lastCol = Math.max(lastCol, c);
        break;
      }
    }
  }
  if (lastCol < range.s.c) return empty;

  // Merge ostidagi kataklar ham bosh katakning qiymatini "meros" qilib oladi —
  // ustunlarni sarlavha bo'yicha solishtirish uchun kerak
  const inheritedValue = new Map<string, string>();
  merges.forEach((m) => {
    const masterValue = readCell(m.s.r, m.s.c);
    if (!masterValue) return;
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        inheritedValue.set(`${r}:${c}`, masterValue);
      }
    }
  });

  const cellValue = (r: number, c: number): string =>
    inheritedValue.get(`${r}:${c}`) ?? readCell(r, c);

  const grid: ExcelGridRow[] = [];
  const keptRowIndices: number[] = [];
  let firstNumericRowIndex = -1;

  for (let r = range.s.r; r <= range.e.r; r++) {
    const cells: ExcelGridCell[] = [];
    let hasValue = false;
    let hasCovered = false;
    let hasNumeric = false;
    let firstText = "";

    for (let c = range.s.c; c <= lastCol; c++) {
      if (coveredCells.has(`${r}:${c}`)) {
        hasCovered = true;
        continue;
      }

      const value = readCell(r, c);
      const span = spanMap.get(`${r}:${c}`);
      const numeric = isNumericValue(value);

      if (value !== "") {
        hasValue = true;
        if (numeric) hasNumeric = true;
        else if (!firstText) firstText = value;
      }

      const isDataRow = firstNumericRowIndex !== -1;
      const effectiveRowSpan =
        isDataRow && c === range.s.c ? 1 : span?.rowSpan ?? 1;

      cells.push({
        value,
        rowSpan: effectiveRowSpan,
        colSpan: span?.colSpan ?? 1,
        isNumeric: numeric,
      });
    }

    // Butunlay bo'sh qatorlarni tashlab yuboramiz (merge davomi bo'lganlaridan tashqari)
    if (!hasValue && !hasCovered) continue;

    // Data qatorlarida tashkilot ustuni (birinchi ustun) merge davomi bo'lgan ortiqcha qatorlarni tashlab yuboramiz
    if (firstNumericRowIndex !== -1 && coveredCells.has(`${r}:${range.s.c}`)) {
      continue;
    }

    // Yashirin (hidden=true, height < 1) yoki ustun UUID lari qatorini tashlab yuboramiz
    if (isHiddenOrUuidRow(worksheet, r, cells)) continue;

    const isColIndexRow = (() => {
      const nonCountable = cells.filter((c) => c.value !== "");
      if (nonCountable.length < 2) return false;
      const hasText = nonCountable.some(
        (c) => isNaN(Number(c.value)) && c.value.length > 2,
      );
      if (hasText) return false;
      return nonCountable.every(
        (c) => !isNaN(Number(c.value)) && Number(c.value) <= 100,
      );
    })();

    const lowerText = firstText.toLowerCase();
    if (hasNumeric && !isColIndexRow && firstNumericRowIndex === -1) {
      firstNumericRowIndex = grid.length;
    }

    grid.push({
      cells,
      // Raqamli qiymat paydo bo'lgunga qadar bo'lgan qatorlar — sarlavha qatorlari
      isHeader: false,
      isTotal: TOTAL_ROW_KEYWORDS.some((kw) => lowerText.includes(kw)),
    });
    keptRowIndices.push(r);
  }

  // Birinchi raqamli qatorgacha bo'lgan hamma qator — sarlavha.
  // Agar umuman raqamli qator bo'lmasa, faqat birinchi qator sarlavha bo'ladi.
  const headerRowCount =
    firstNumericRowIndex === -1
      ? Math.min(1, grid.length)
      : firstNumericRowIndex;
  for (let i = 0; i < headerRowCount; i++) grid[i].isHeader = true;

  const columnCount = lastCol - range.s.c + 1;

  // Ustun bo'yicha sarlavha zanjiri: sarlavha qatorlaridagi takrorlanmaydigan qiymatlar
  const headerChains: string[][] = [];
  for (let c = range.s.c; c <= lastCol; c++) {
    const chain: string[] = [];
    for (let i = 0; i < headerRowCount; i++) {
      const value = cellValue(keptRowIndices[i], c);
      if (value && !chain.includes(value)) chain.push(value);
    }
    headerChains.push(chain);
  }

  // Sarlavhadan keyingi qatorlar
  const dataRows: ExcelDataRow[] = [];
  for (let i = headerRowCount; i < keptRowIndices.length; i++) {
    const r = keptRowIndices[i];
    const cells: string[] = [];
    for (let c = range.s.c; c <= lastCol; c++) cells.push(cellValue(r, c));
    dataRows.push({ cells, isTotal: grid[i].isTotal });
  }

  return { grid, columnCount, headerChains, dataRows };
};

/**
 * Parses an already-read Excel buffer into a structured object.
 */
export const parseExcelBuffer = async (
  data: Uint8Array,
  fileName: string,
): Promise<ParsedExcelReport> => {
  XLSX = await import("xlsx");
  const workbook = XLSX.read(data, { type: "array" });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // 1. Extract 2D array of raw rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
  });

  // 2. Extract key-value objects
  const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  });

  // 3. Build a value map (row_col or col -> value)
  const valueMap: Record<string, string> = {};

  // Traverse rawRows to extract cell values by header/column match
  if (rawRows.length > 0) {
    // Identify potential header row (usually the last header row before numbers/data)
    let headerRowIndex = 0;
    for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
      if (
        rawRows[r] &&
        rawRows[r].some(
          (c: any) => typeof c === "string" && c.trim().length > 0,
        )
      ) {
        const nonEmpties = (rawRows[r] as any[])
          .map((c: any) => String(c || "").trim())
          .filter(Boolean);
        const isUuidRow =
          nonEmpties.length > 0 &&
          nonEmpties.every((v: string) => isUuidString(v));
        if (!isUuidRow) {
          headerRowIndex = r;
        }
      }
    }

    const headers = (rawRows[headerRowIndex] || []).map((h: any) =>
      String(h || "").trim(),
    );

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const firstCell = String(row[0] || "").trim(); // Row identifier (e.g. plant name or org name)

      headers.forEach((header: string, cIndex: number) => {
        if (!header) return;
        const val = String(row[cIndex] ?? "").trim();

        if (val !== "") {
          // Store key: header
          if (!valueMap[header]) {
            valueMap[header] = val;
          }
          // Store key: rowIdentifier_header
          if (firstCell) {
            valueMap[`${firstCell}__${header}`] = val;
          }
        }
      });
    }
  }

  // 4. Exceldagi ko'rinishni aynan takrorlash uchun merge'li jadval.
  // Hisobot ilovalari alohida varaqlarda bo'lishi mumkin — hammasini o'qiymiz.
  const sheets: ParsedExcelSheet[] = workbook.SheetNames.map((name) => ({
    name,
    ...buildGrid(workbook.Sheets[name]),
  }));

  // Eski kod (preview, bitta varaqli fayllar) uchun — birinchi ma'lumotli varaq
  const primary =
    sheets.find((sheet) => sheet.dataRows.length > 0) ||
    sheets[0] || {
      name: firstSheetName,
      grid: [],
      columnCount: 0,
      headerChains: [],
      dataRows: [],
    };

  return {
    fileName,
    sheetNames: workbook.SheetNames,
    rawRows,
    jsonData,
    valueMap,
    sheets,
    grid: primary.grid,
    columnCount: primary.columnCount,
    headerChains: primary.headerChains,
    dataRows: primary.dataRows,
  };
};

/**
 * Reads an Excel file (.xlsx, .xls) and parses its active sheet contents into a structured object.
 */
export const parseExcelFile = (file: File): Promise<ParsedExcelReport> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        resolve(parseExcelBuffer(data, file.name));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
};
