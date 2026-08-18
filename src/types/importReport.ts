/** `/reports/import-parse/` javob formati (frontend_import_integration_en.md) */

export interface ImportParseItem {
  /** statement_column UUID */
  column: string;
  value: string;
  row?: number;
  organization?: string;
}

export interface ImportParsePlant {
  /** o'simlik UUID */
  plant: string;
  plant_name?: string;
  items: ImportParseItem[];
}

export interface ImportParseRow {
  row: number;
  organization?: string;
  items: ImportParseItem[];
}

/**
 * Backend `warnings` / `errors` ni ba'zan oddiy matn, ba'zan obyekt
 * (`{row, column_title, message}`) ko'rinishida qaytaradi — ikkalasini ham qo'llab-quvvatlaymiz.
 */
export interface ImportParseIssueObject {
  message?: string | null;
  row?: number | string | null;
  column_title?: string | null;
}

export type ImportParseIssue = string | ImportParseIssueObject;

export interface ImportParseResponse {
  status: string;
  is_plant_based?: boolean;
  /** Oddiy (flat) hisobotlar uchun */
  items?: ImportParseItem[];
  /** O'simlik kesimidagi hisobotlar uchun */
  plants?: ImportParsePlant[];
  /** Yangi format: barcha qatorlar bo'yicha guruhlangan */
  rows?: ImportParseRow[];
  warnings?: ImportParseIssue[];
  errors?: ImportParseIssue[];
}

/**
 * Ogohlantirish/xatoni toast uchun matnga aylantiradi.
 * Obyektni to'g'ridan-to'g'ri toast'ga bersak React "Objects are not valid as a
 * React child" xatosi bilan butun sahifani yiqitadi.
 */
export const formatImportIssue = (issue: ImportParseIssue): string => {
  if (issue == null) return "";
  if (typeof issue === "string") return issue.trim();
  if (typeof issue !== "object") return String(issue);

  const prefix: string[] = [];
  if (issue.row != null && issue.row !== "") prefix.push(`${issue.row}-qator`);
  if (issue.column_title) prefix.push(String(issue.column_title));

  const message = issue.message ? String(issue.message) : "";
  const text = message || JSON.stringify(issue);

  return prefix.length > 0 ? `${prefix.join(", ")}: ${text}` : text;
};

/**
 * Flat `items` ro'yxatini formulalarga (qatorlarga) bo'ladi.
 *
 * Backend ba'zan o'simlik kesimidagi hisobotni `plants` emas, oddiy `items`
 * ko'rinishida qaytaradi — bunda Exceldagi har bir qator uchun bir xil ustun
 * UUID lari qayta-qayta keladi. Bitta ustun ikkinchi marta uchraganda — bu
 * yangi qator (formula) degani, aks holda hammasi bitta formulaga tushib,
 * faqat oxirgi qator ko'rinib qolardi.
 */
export const splitImportItemsIntoRows = (
  items: ImportParseItem[] = [],
): ImportParseItem[][] => {
  const rows: ImportParseItem[][] = [];
  const usedColumnsPerRow: Set<string>[] = [];

  items.forEach((item) => {
    const columnId = String(item.column ?? "");

    let rowIndex = 0;
    while (
      rowIndex < rows.length &&
      usedColumnsPerRow[rowIndex].has(columnId)
    ) {
      rowIndex += 1;
    }

    if (rowIndex === rows.length) {
      rows.push([]);
      usedColumnsPerRow.push(new Set<string>());
    }

    rows[rowIndex].push(item);
    usedColumnsPerRow[rowIndex].add(columnId);
  });

  return rows;
};
