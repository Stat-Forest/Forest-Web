// Shartnomalarni Excel'dan import qilish — billing `pages/contracts/upload-excel.vue`
// parsing mantig'ining tiplashtirilgan porti.
//
// Shablon (`billing_template_front_last.xlsx` / b2_toliq_namuna.xlsx):
//   - varaq A2 dan boshlanadi: o'qilgan massivda 0-qator — ustun sarlavhalari
//     (Excel 2-qator), 1-qator — kalitlar (department_inn, contract_date, ...;
//     Excel 3-qator), ma'lumotlar 2-qatordan (Excel 4-qator) boshlanadi;
//   - BO/BP (66/67) — kenglik/uzunlik; BQ.. (68, 75, 82, 89) — yillik summalar
//     bloklari (2020–2026, har biri 7 ustun);
//   - "Жами хисобланган" → rent_amount, "Жами тўланган" → paid_amount.
//
// Billing'dan farq (ataylab): `contract.xojalik_inn` — faqat XO'JALIK (department)
// INN'i; ijarachining 9 xonali STIR'i `renter.stir`ga, 14 xonali JSHSHIR'i
// `renter.pinfl`ga yoziladi. Yer/faoliyat/imtiyoz turlari backendga NOM bilan
// yuboriladi (backend `find_type_by_name` — katta-kichik harf va bo'sh joylarga
// befarq), shuning uchun shablonning inglizcha kalitlari ma'lumotnoma nomlariga
// o'giriladi, qolganlari uchun ustun sarlavhasi ishlatiladi.
import * as XLSX from "xlsx";
import { YEARS } from "./constants";
import { formatDate, parseDate } from "./format";
import type {
  ContractWriteAction,
  ContractWriteActionProduct,
  ContractWriteErrors,
  ContractWriteRenter,
  ContractWriteTypedArea,
  ContractWriteYearlyAmount,
  ImportRow,
  ImportRowContract,
} from "./types";

export type CellValue = string | number | boolean | Date | null;

export type ImportRowKind = "data" | "empty" | "header";

export interface ParsedExcelRow {
  /** `rows` massividagi indeks (0 — sarlavhalar qatori) */
  index: number;
  /** Excel'dagi haqiqiy qator raqami (1-asosli) */
  excelRow: number;
  cells: CellValue[];
  row: ImportRow;
  kind: ImportRowKind;
}

export interface ParsedExcel {
  fileName: string;
  sheetName: string;
  /** 0-qator — ustun sarlavhalari */
  labels: CellValue[];
  /** 1-qator — kalitlar */
  keys: CellValue[];
  keyMap: Map<number, string>;
  columnCount: number;
  columns: ColumnSpec[];
  /** Faqat ma'lumot qatorlari (sarlavha/kalit qatorlari emas) */
  rows: ParsedExcelRow[];
}

export class ExcelImportError extends Error {
  constructor(
    message: string,
    public readonly code: "not_xlsx" | "empty" | "too_short" | "read_failed",
  ) {
    super(message);
    this.name = "ExcelImportError";
  }
}

// ---------------------------------------------------------------------------
// Ustun tasnifi
// ---------------------------------------------------------------------------

export type ColumnSection =
  | "contract"
  | "renter"
  | "action"
  | "product"
  | "land"
  | "activity"
  | "privilege"
  | "yearly"
  | "ignore";

export interface ColumnSpec {
  index: number;
  section: ColumnSection;
  /** contract/renter/action/product maydoni yoki yillik blok maydoni */
  field?: string;
  /** land/activity/privilege — backendga yuboriladigan tur nomi */
  typeName?: string;
  /** yearly — yil */
  year?: number;
  key: string | null;
  label: string;
}

const normalize = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Qator ichidagi \n/\r ni bo'sh joyga aylantiradi, ortiqcha bo'sh joylarni yig'adi. */
export const collapseText = (value: unknown): string =>
  String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const CONTRACT_FIELD_BY_KEY: Record<string, keyof ImportRowContract> = {
  department_inn: "xojalik_inn",
  xojalik_inn: "xojalik_inn",
  department: "xojalik",
  department_name: "xojalik",
  xojalik: "xojalik",
  contract_date: "contract_date",
  expired_date: "expired_date",
  contract_number: "contract_number",
  department_branch: "bolim",
  branch: "bolim",
  bolim: "bolim",
  region_code: "region_code",
  district_code: "district_code",
  rotation_number: "circle",
  circle: "circle",
  quarter_number: "section",
  section: "section",
  contour_number: "counter",
  counter: "counter",
  parcel_number: "massive",
  massive: "massive",
  total_leased_land_area_ha: "rent_area",
  rent_area: "rent_area",
  total_calculated: "rent_amount",
  rent_amount: "rent_amount",
  total_paid: "paid_amount",
  paid_amount: "paid_amount",
  penalty_amount: "penalty_amount",
  panalty_amount: "penalty_amount",
  cancel_date: "canceled_date",
  canceled_date: "canceled_date",
  cancel_reason: "cancel_reason",
  cadastral_number: "cadastral_number",
  auction_date: "auction_date",
  exemptioned_date: "exemptioned_date",
  latitude: "latitude",
  longitude: "longitude",
  кенглик: "latitude",
  узунлик: "longitude",
};

const CONTRACT_FIELD_BY_LABEL: Array<[string, keyof ImportRowContract]> = [
  ["кадастр рақами", "cadastral_number"],
  ["аукцион ўтказилган сана", "auction_date"],
  ["бошланиш санаси", "contract_date"],
  ["тугаш санаси", "expired_date"],
  ["шартнома рақами", "contract_number"],
  ["юридик шахс номи", "xojalik"],
  ["вилоят коди", "region_code"],
  ["туман коди", "district_code"],
  ["айланма рақами", "circle"],
  ["квартал рақами", "section"],
  ["контур рақами", "counter"],
  ["видел рақами", "massive"],
  ["жами ижарага олинган", "rent_area"],
  ["жами хисобланган", "rent_amount"],
  ["жами тўланган", "paid_amount"],
  ["шундан пеня", "penalty_amount"],
  ["бекор қилинган сана", "canceled_date"],
  ["бекор қилиш сабаби", "cancel_reason"],
  ["ўрмон бўлими номи", "bolim"],
];

const RENTER_FIELD_BY_KEY: Record<string, keyof ContractWriteRenter> = {
  pinfl: "pinfl",
  jshshir: "pinfl",
  stir: "stir",
  inn: "stir",
  fio: "full_name",
  full_name: "full_name",
  user_address: "per_adr",
  per_adr: "per_adr",
  address: "per_adr",
  passport: "passport",
  phone_number: "phone",
  phone: "phone",
  citizenship: "citizenship",
  birth_place: "birth_place",
  legal_name: "legal_name",
};

const RENTER_FIELD_BY_LABEL: Array<[string, keyof ContractWriteRenter]> = [
  ["жшшир", "pinfl"],
  ["тўлиқ ф.и.ш", "full_name"],
  ["яшаш манзили", "per_adr"],
  ["паспорт", "passport"],
  ["телефон", "phone"],
];

const ACTION_FIELD_BY_KEY: Record<string, keyof ContractWriteAction> = {
  new_jobs_created: "vacancy",
  vacancy: "vacancy",
  investment_value_thousand_sum: "own_investment",
  own_investment: "own_investment",
};

const ACTION_FIELD_BY_LABEL: Array<[string, keyof ContractWriteAction]> = [
  ["иш ўринлар", "vacancy"],
  ["инвестиция қиймати", "own_investment"],
];

const PRODUCT_FIELD_BY_KEY: Record<string, keyof ContractWriteActionProduct> = {
  product_type: "product_export",
  product_export: "product_export",
  product_quantity: "product_amount",
  product_amount: "product_amount",
  volume_thousand_usd: "export_amount",
  export_amount: "export_amount",
};

const PRODUCT_FIELD_BY_LABEL: Array<[string, keyof ContractWriteActionProduct]> = [
  ["махсулот тури", "product_export"],
  ["маҳсулот тури", "product_export"],
  ["махсулот миқдори", "product_amount"],
  ["маҳсулот миқдори", "product_amount"],
  ["хажми", "export_amount"],
];

/** Shablonda bor, lekin API'da mos maydoni yo'q ustunlar. */
const IGNORED_KEYS = new Set([
  "remaining_date",
  "region_name",
  "district_name",
  "total_privileged_area",
  "total_debt",
  "self_funded_thousand_sum",
  "№",
]);
const IGNORED_LABELS = ["ижара муддати", "мулкчилик шакли", "вилоят номи", "туман номи", "жами қарздорлик", "ўз хисобидан"];

/**
 * Shablon kaliti → ma'lumotnoma (billing_reference.json) dagi tur nomi.
 * Faqat nomi ustun sarlavhasidan farq qiladiganlar; qolganlari sarlavhadan olinadi.
 */
const TYPE_NAME_BY_KEY: Record<string, string> = {
  // Yer turlari
  desert: "Чўл",
  mountain: "Тоғ",
  valley: "Водий",
  riparian_forest: "Тўқай",
  other_uncultivated_lands: "Ўзлаштирилмаган бошқа ерлар",
  // Faoliyat turlari
  forest_establishment: "ўрмон барпо қилиш",
  agricultural_crop_cultivation: "қишлоқ хўжалиги экинларини экиш",
  fruit_orchard_establishment: "мевали боғлар барпо этиш",
  nut_orchard_establishment: "ёнғоқ мевали боғлар барпо этиш (писта, бодом, ёнғоқ) фаолияти",
  seedling_nursery_operations: "кўчат етиштириш фаолияти",
  greenhouse_and_lemonarium_operations: "лимонарий ва иссиқхоналар ташкил этиш фаолияти",
  hayfield_usage: "пичанзорлардан фойдаланиш (пичан йиғиштириш)",
  medicinal_plant_cultivation: "доривор ўсимликлар етиштириш фаолияти",
  hunting_activity: "овчилик фаолияти (овчиларни қабул қилиш пункти)",
  other_activities: "бошқа фаолият турлари",
  // Imtiyozlar
  nut_and_fast_growing_tree_plantations_5y:
    "Ёнғоқ мевали боғлар (писта, бодм, ёнғоқ) тез ўсувчи дарахтлар (павлония ва терак) эгалаган майдонлар (га) (5 йил)",
  agricultural_food_crops_1y: "Қ/Х экинлари экиш (га) (1 йил)",
  medicinal_plant_plantations_3y: "Доривор ўсимликлар етиштириш (га) (3 йил)",
  desert_plants_10y: "чўл ўсимликлари (саксовул, черкез, қандим, қорабуроқ) экиш (га) (10 йил)",
};

const LAND_KEYS = new Set(["desert", "mountain", "valley", "riparian_forest", "other_uncultivated_lands"]);
const PRIVILEGE_KEYS = new Set([
  "nut_and_fast_growing_tree_plantations_5y",
  "agricultural_food_crops_1y",
  "medicinal_plant_plantations_3y",
  "desert_plants_10y",
]);
const ACTIVITY_KEYS = new Set([
  "forest_establishment",
  "agricultural_crop_cultivation",
  "fruit_orchard_establishment",
  "nut_orchard_establishment",
  "seedling_nursery_operations",
  "greenhouse_and_lemonarium_operations",
  "hayfield_usage",
  "medicinal_plant_cultivation",
  "hunting_activity",
  "fast_growing_tree_plantation",
  "fruit_and_ornamental_seedling_growing",
  "medicinal_plantation_establishment",
  "beekeeping_activity",
  "fish_farming",
  "hunting_farm_establishment",
  "eco_tourism_and_recreation",
  "special_forest_enterprise_activities",
  "wild_animal_breeding_center",
  "other_activities",
]);

/** billing `isPrivilegeKey` porti — sarlavha/kalit bo'yicha imtiyoz ustuni. */
export const isPrivilegeLabel = (text: string): boolean => {
  const k = normalize(text);
  if (!k) return false;
  if (k.includes("privilege") || k.includes("imtiyoz")) return true;
  const hasPeriod = /\b(10|5|3|1) ?(йил|yil)\b/.test(k);
  const hasArea = k.includes("(га)") || k.includes("экиш") || k.includes("плантациялари");
  if (hasPeriod && hasArea) return true;
  if (k.includes("чўл ўсимликлари") && k.includes("экиш")) return true;
  if (k.includes("ёнғоқ мевали боғлар") && k.includes("плантациялари") && !k.includes("барпо этиш")) return true;
  if (k.includes("озиқ-овқат") && k.includes("экинлари")) return true;
  if (k.includes("доривор ўсимликлар") && k.includes("плантациялари") && !k.includes("фаолияти") && hasPeriod) return true;
  return false;
};

const isLandLabel = (text: string): boolean => {
  const k = normalize(text);
  if (!k || isPrivilegeLabel(k)) return false;
  return (
    (k.includes("чўл") && !k.includes("ўсимликлари")) ||
    k === "тоғ" ||
    k === "водий" ||
    k === "тўқай" ||
    k.includes("ўзлаштирилмаган")
  );
};

const isActivityLabel = (text: string): boolean => {
  const k = normalize(text);
  if (!k || isPrivilegeLabel(k)) return false;
  return (
    k.includes("фаолият") ||
    k.includes("барпо") ||
    k.includes("экинларини экиш") ||
    k.includes("етиштириш") ||
    k.includes("фойдаланиш") ||
    k.includes("ташкил этиш") ||
    k.includes("туризм") ||
    k.includes("плантация") ||
    k.includes("питомниг") ||
    k.includes("ўрмон хўжаликларида")
  );
};

const findByLabel = <T extends string>(label: string, table: Array<[string, T]>): T | undefined => {
  const k = normalize(label);
  if (!k) return undefined;
  return table.find(([needle]) => k.includes(needle))?.[1];
};

const isYearKey = (value: CellValue): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 2000 && value <= 2100;

const YEARLY_FIELDS: Array<keyof Omit<ContractWriteYearlyAmount, "year">> = [
  "contract_amount",
  "calculated_amount",
  "paid_amount",
  "penalty_amount",
];
/** b2 shabloni: yillik bloklarning boshlang'ich ustunlari (kalitlar bo'lmasa). */
const YEARLY_BLOCK_START = [68, 75, 82, 89];
const LATITUDE_COL = 66;
const LONGITUDE_COL = 67;

/**
 * Sarlavha (0-qator) va kalitlar (1-qator) bo'yicha har bir ustunning
 * tasnifini tuzadi.
 */
export const classifyColumns = (
  labels: CellValue[],
  keys: CellValue[],
  columnCount: number,
): ColumnSpec[] => {
  const specs: ColumnSpec[] = [];
  const yearRuns: number[][] = [];
  let currentRun: number[] = [];

  for (let i = 0; i < columnCount; i++) {
    const rawKey = keys[i];
    const label = collapseText(labels[i]);
    const key = rawKey === null || rawKey === undefined || rawKey === "" ? null : collapseText(rawKey);
    const base: ColumnSpec = { index: i, section: "ignore", key, label };

    if (isYearKey(rawKey)) {
      // Bloklar ketma-ket turadi (2020..2026, 2020..2026, ...) — yil kamaysa
      // yangi blok boshlanadi
      const prevYear = currentRun.length ? (keys[currentRun[currentRun.length - 1]] as number) : null;
      if (prevYear !== null && rawKey <= prevYear) {
        yearRuns.push(currentRun);
        currentRun = [];
      }
      currentRun.push(i);
      specs.push({ ...base, section: "yearly", year: rawKey });
      continue;
    }
    if (currentRun.length) {
      yearRuns.push(currentRun);
      currentRun = [];
    }

    const keyNorm = key ? normalize(key) : "";
    const keyId = keyNorm.replace(/\s+/g, "_");

    if (keyId && IGNORED_KEYS.has(keyId)) {
      specs.push(base);
      continue;
    }
    if (keyId && CONTRACT_FIELD_BY_KEY[keyId]) {
      specs.push({ ...base, section: "contract", field: CONTRACT_FIELD_BY_KEY[keyId] });
      continue;
    }
    if (keyId && RENTER_FIELD_BY_KEY[keyId]) {
      specs.push({ ...base, section: "renter", field: RENTER_FIELD_BY_KEY[keyId] });
      continue;
    }
    if (keyId && ACTION_FIELD_BY_KEY[keyId]) {
      specs.push({ ...base, section: "action", field: ACTION_FIELD_BY_KEY[keyId] });
      continue;
    }
    if (keyId && PRODUCT_FIELD_BY_KEY[keyId]) {
      specs.push({ ...base, section: "product", field: PRODUCT_FIELD_BY_KEY[keyId] });
      continue;
    }
    if (keyId && LAND_KEYS.has(keyId)) {
      specs.push({ ...base, section: "land", typeName: TYPE_NAME_BY_KEY[keyId] ?? label });
      continue;
    }
    if (keyId && PRIVILEGE_KEYS.has(keyId)) {
      specs.push({ ...base, section: "privilege", typeName: TYPE_NAME_BY_KEY[keyId] ?? label });
      continue;
    }
    if (keyId && ACTIVITY_KEYS.has(keyId)) {
      specs.push({ ...base, section: "activity", typeName: TYPE_NAME_BY_KEY[keyId] ?? label });
      continue;
    }

    // Kalit yo'q yoki noma'lum — sarlavha bo'yicha
    const text = label || key || "";
    if (IGNORED_LABELS.some((needle) => normalize(text).includes(needle))) {
      specs.push(base);
      continue;
    }
    const renterField = findByLabel(text, RENTER_FIELD_BY_LABEL);
    if (renterField) {
      specs.push({ ...base, section: "renter", field: renterField });
      continue;
    }
    const contractField = findByLabel(text, CONTRACT_FIELD_BY_LABEL);
    if (contractField) {
      specs.push({ ...base, section: "contract", field: contractField });
      continue;
    }
    const actionField = findByLabel(text, ACTION_FIELD_BY_LABEL);
    if (actionField) {
      specs.push({ ...base, section: "action", field: actionField });
      continue;
    }
    const productField = findByLabel(text, PRODUCT_FIELD_BY_LABEL);
    if (productField) {
      specs.push({ ...base, section: "product", field: productField });
      continue;
    }
    if (normalize(text) === "стир" || normalize(text) === "stir") {
      // Shablonning B ustuni ("СТИР", kaliti department_inn) — xo'jalik INN'i
      specs.push({ ...base, section: "contract", field: "xojalik_inn" });
      continue;
    }
    if (isPrivilegeLabel(text)) {
      specs.push({ ...base, section: "privilege", typeName: collapseText(text) });
      continue;
    }
    if (isLandLabel(text)) {
      specs.push({ ...base, section: "land", typeName: collapseText(text) });
      continue;
    }
    if (isActivityLabel(text)) {
      specs.push({ ...base, section: "activity", typeName: collapseText(text) });
      continue;
    }
    if (i === LATITUDE_COL && !key) {
      specs.push({ ...base, section: "contract", field: "latitude" });
      continue;
    }
    if (i === LONGITUDE_COL && !key) {
      specs.push({ ...base, section: "contract", field: "longitude" });
      continue;
    }
    specs.push(base);
  }
  if (currentRun.length) yearRuns.push(currentRun);

  // Yillik bloklar: kalitlar qatoridagi yil ketma-ketliklari tartibida
  // contract_amount → calculated_amount → paid_amount → penalty_amount
  if (yearRuns.length) {
    yearRuns.forEach((run, blockIdx) => {
      const field = YEARLY_FIELDS[blockIdx];
      run.forEach((colIdx) => {
        if (field) specs[colIdx] = { ...specs[colIdx], field };
        else specs[colIdx] = { ...specs[colIdx], section: "ignore" };
      });
    });
  } else {
    // Kalitlar yo'q — b2 shablonining qat'iy pozitsiyalari
    YEARLY_BLOCK_START.forEach((start, blockIdx) => {
      YEARS.forEach((year, offset) => {
        const colIdx = start + offset;
        if (colIdx < columnCount && specs[colIdx] && specs[colIdx].section === "ignore") {
          specs[colIdx] = { ...specs[colIdx], section: "yearly", field: YEARLY_FIELDS[blockIdx], year };
        }
      });
    });
  }

  return specs;
};

// ---------------------------------------------------------------------------
// Qiymatlarni normallashtirish
// ---------------------------------------------------------------------------

const isBlank = (value: CellValue | undefined): boolean =>
  value === null || value === undefined || value === "" || (typeof value === "string" && !value.trim());

/** "11 497 400,0" / 11497400 / "5.5" → son; noto'g'ri → null. Kasrlar saqlanadi. */
export const parseNumericCell = (value: CellValue | undefined): number | null => {
  if (isBlank(value) || typeof value === "boolean" || value instanceof Date) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let text = String(value).trim().replace(/[\s\u00a0]/g, "");
  if (text.includes(",") && !text.includes(".")) text = text.replace(",", ".");
  else text = text.replace(/,/g, "");
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
};

/** 1735 / "1735" / 1735.0 → "1735"; bo'sh → null (billing `normalizeCode`). */
export const normalizeCode = (value: CellValue | undefined): string | null => {
  if (isBlank(value) || value instanceof Date) return null;
  const text = String(value).trim().replace(/^(\d+)\.0+$/, "$1");
  return text || null;
};

const textValue = (value: CellValue | undefined): string | null => {
  if (isBlank(value)) return null;
  if (value instanceof Date) return formatDate(value);
  const text = collapseText(value);
  return text || null;
};

const excelSerialToDate = (serial: number): string | null => {
  if (!(serial > 1 && serial < 200000)) return null;
  const parsed = XLSX.SSF.parse_date_code(serial) as { y: number; m: number; d: number } | null;
  if (!parsed) return null;
  return formatDate(new Date(parsed.y, parsed.m - 1, parsed.d));
};

/**
 * Excel sanasi (serial raqam / Date / "dd.MM.yyyy" / ISO) → `dd.MM.yyyy`.
 * Tanib bo'lmasa — asl matn (backend aniq xato qaytaradi).
 */
export const toImportDate = (value: CellValue | undefined): string | null => {
  if (isBlank(value) || typeof value === "boolean") return null;
  if (value instanceof Date) return formatDate(value) || null;
  if (typeof value === "number") return excelSerialToDate(value) ?? String(value);
  const text = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(text)) {
    return excelSerialToDate(Number(text)) ?? text;
  }
  const parsed = parseDate(text);
  return parsed ? formatDate(parsed) : text;
};

const digitsOnly = (value: string): string => value.replace(/\D/g, "");

const ensurePhonePrefix = (value: string | null): string | null => {
  if (!value) return null;
  const digits = digitsOnly(value);
  if (!digits) return value;
  return `+${digits}`;
};

const roundCoord = (value: number): number => Math.round(value * 1e7) / 1e7;

const CONTRACT_DATE_FIELDS = new Set<keyof ImportRowContract>([
  "contract_date",
  "expired_date",
  "auction_date",
  "exemptioned_date",
  "canceled_date",
]);
const CONTRACT_NUMBER_FIELDS = new Set<keyof ImportRowContract>([
  "rent_amount",
  "paid_amount",
  "penalty_amount",
  "rent_area",
]);
const CONTRACT_CODE_FIELDS = new Set<keyof ImportRowContract>([
  "xojalik_inn",
  "region_code",
  "district_code",
  "circle",
  "section",
  "counter",
  "massive",
  "contract_number",
  "cadastral_number",
]);

/** Bitta Excel qatori (kataklar) → `ImportRow` (API `rows[]` elementi). */
export const buildImportRow = (cells: CellValue[], columns: ColumnSpec[]): ImportRow => {
  const contract: ImportRowContract = {};
  const renter: ContractWriteRenter = {};
  const action: ContractWriteAction = {};
  const product: ContractWriteActionProduct = {};
  const lands: ContractWriteTypedArea[] = [];
  const activities: ContractWriteTypedArea[] = [];
  const privileges: ContractWriteTypedArea[] = [];
  const yearly = new Map<number, ContractWriteYearlyAmount>();

  columns.forEach((spec) => {
    const value = cells[spec.index];
    if (isBlank(value)) return;

    switch (spec.section) {
      case "contract": {
        const field = spec.field as keyof ImportRowContract;
        if (CONTRACT_DATE_FIELDS.has(field)) {
          (contract as Record<string, unknown>)[field] = toImportDate(value);
        } else if (CONTRACT_NUMBER_FIELDS.has(field)) {
          const num = parseNumericCell(value);
          (contract as Record<string, unknown>)[field] = num ?? textValue(value);
        } else if (field === "latitude" || field === "longitude") {
          const num = parseNumericCell(value);
          (contract as Record<string, unknown>)[field] = num === null ? textValue(value) : roundCoord(num);
        } else if (CONTRACT_CODE_FIELDS.has(field)) {
          (contract as Record<string, unknown>)[field] = normalizeCode(value);
        } else {
          (contract as Record<string, unknown>)[field] = textValue(value);
        }
        break;
      }
      case "renter": {
        const field = spec.field as keyof ContractWriteRenter;
        const text = normalizeCode(value);
        if (!text) break;
        if (field === "pinfl") {
          // Shablonning "ЖШШИР (ИНН юридик шахс)" ustuni: 9 raqam — yuridik shaxs
          // INN'i (stir), 14 raqam — jismoniy shaxs JSHSHIR'i (pinfl)
          const digits = digitsOnly(text);
          if (digits.length === 9) renter.stir = digits;
          else renter.pinfl = digits.length === 14 ? digits : text;
        } else if (field === "stir") {
          renter.stir = digitsOnly(text) || text;
        } else if (field === "phone") {
          renter.phone = ensurePhonePrefix(text);
        } else {
          (renter as Record<string, unknown>)[field] = text;
        }
        break;
      }
      case "action": {
        const field = spec.field as keyof ContractWriteAction;
        const num = parseNumericCell(value);
        (action as Record<string, unknown>)[field] = num ?? textValue(value);
        break;
      }
      case "product": {
        const field = spec.field as keyof ContractWriteActionProduct;
        if (field === "product_export") product.product_export = textValue(value);
        else {
          const num = parseNumericCell(value);
          (product as Record<string, unknown>)[field] = num ?? textValue(value);
        }
        break;
      }
      case "land":
      case "activity":
      case "privilege": {
        const area = parseNumericCell(value);
        if (area === null || area <= 0 || !spec.typeName) break;
        const item: ContractWriteTypedArea = { type: spec.typeName, area };
        if (spec.section === "land") lands.push(item);
        else if (spec.section === "activity") activities.push(item);
        else privileges.push(item);
        break;
      }
      case "yearly": {
        if (!spec.year || !spec.field) break;
        const num = parseNumericCell(value);
        if (num === null) break;
        const row: ContractWriteYearlyAmount = yearly.get(spec.year) ?? { year: spec.year };
        row[spec.field as (typeof YEARLY_FIELDS)[number]] = num;
        yearly.set(spec.year, row);
        break;
      }
      default:
        break;
    }
  });

  if (renter.stir && !renter.is_legal_entity && !renter.pinfl) renter.is_legal_entity = true;

  const row: ImportRow = { contract, renter };
  if (lands.length) row.lands = lands;
  if (activities.length) row.activities = activities;
  if (privileges.length) row.privileges = privileges;
  if (action.vacancy !== undefined || action.own_investment !== undefined) row.action = action;
  if (
    product.product_export !== undefined ||
    product.product_amount !== undefined ||
    product.export_amount !== undefined
  ) {
    row.action_products = [product];
  }
  // Barcha summalari 0 bo'lgan yillar yuborilmaydi (formadagi qoida bilan bir xil)
  const yearlyRows = Array.from(yearly.values())
    .filter((r) => YEARLY_FIELDS.some((f) => Number(r[f] ?? 0) !== 0))
    .sort((a, b) => a.year - b.year);
  if (yearlyRows.length) row.yearly_amounts = yearlyRows;
  return row;
};

// ---------------------------------------------------------------------------
// Faylni o'qish
// ---------------------------------------------------------------------------

const HEADER_HINT_RE = /(_date|_number|_inn|_code|_amount|_area)$/;

/** Sarlavha/kalit/formula-ko'rsatma qatori: kataklarda kalit nomlari turadi. */
const KNOWN_KEYS = new Set<string>([
  ...Object.keys(CONTRACT_FIELD_BY_KEY),
  ...Object.keys(RENTER_FIELD_BY_KEY),
  ...Object.keys(ACTION_FIELD_BY_KEY),
  ...Object.keys(PRODUCT_FIELD_BY_KEY),
  ...LAND_KEYS,
  ...PRIVILEGE_KEYS,
  ...ACTIVITY_KEYS,
]);

const looksLikeHeaderRow = (cells: CellValue[], keySet: Set<string>): boolean => {
  let hits = 0;
  let strings = 0;
  for (const cell of cells) {
    if (isBlank(cell) || typeof cell !== "string") continue;
    strings += 1;
    const k = normalize(cell).replace(/\s+/g, "_");
    if (keySet.has(k) || KNOWN_KEYS.has(k) || HEADER_HINT_RE.test(k)) hits += 1;
  }
  return hits >= 2 && hits >= Math.ceil(strings / 3);
};

const readWorkbook = (data: ArrayBuffer): XLSX.WorkBook => {
  try {
    // cellStyles — sariq kalit kataklarini aniqlash uchun (community build'da
    // fill kelmasa ham xato bermaydi); cellDates: false — sanalar serial raqam
    // sifatida o'qiladi (Date bilan vaqt zonasi siljishi bo'lmasin).
    return XLSX.read(data, { type: "array", cellStyles: true, cellNF: false, cellHTML: false, cellDates: false });
  } catch {
    return XLSX.read(data, { type: "array", cellDates: false });
  }
};

interface StyledCell extends XLSX.CellObject {
  s?: { fill?: { fgColor?: { rgb?: string } } };
}

const isYellow = (cell: StyledCell | undefined): boolean => {
  const rgb = cell?.s?.fill?.fgColor?.rgb;
  if (!rgb || typeof rgb !== "string" || rgb.length < 6) return false;
  const hex = rgb.slice(-6);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return r > 200 && g > 200 && b < 100;
};

/**
 * Kalitlar xaritasi (ustun indeksi → kalit): 1-qatordagi sariq kataklar, ular
 * bo'lmasa 1-qatorning barcha matnli kataklari (billing `detectYellowCellKeys`).
 */
const detectKeyMap = (sheet: XLSX.WorkSheet, range: XLSX.Range, keysRow: CellValue[]): Map<number, string> => {
  const keyMap = new Map<number, string>();
  const rowIdx = range.s.r + 1;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: rowIdx, c })] as StyledCell | undefined;
    if (!cell || cell.v === undefined || cell.v === null) continue;
    const text = String(cell.v).trim();
    if (!text) continue;
    const col = c - range.s.c;
    if (isYellow(cell) || text.includes("_") || /^[a-zA-Z][a-zA-Z0-9_]*$/.test(text) || /[а-яА-Я]/.test(text)) {
      keyMap.set(col, text);
    }
  }
  if (keyMap.size === 0) {
    keysRow.forEach((value, col) => {
      if (isBlank(value)) return;
      keyMap.set(col, collapseText(value));
    });
  }
  return keyMap;
};

/** Excel faylni o'qib, sarlavhalar, kalitlar va `ImportRow` qatorlarini qaytaradi. */
export const parseContractsExcel = async (file: File): Promise<ParsedExcel> => {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new ExcelImportError("Faqat .xlsx formatdagi fayl yuklang", "not_xlsx");
  }
  let workbook: XLSX.WorkBook;
  try {
    workbook = readWorkbook(await file.arrayBuffer());
  } catch {
    throw new ExcelImportError("Excel faylni o'qishda xatolik yuz berdi", "read_failed");
  }
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet || !sheet["!ref"]) {
    throw new ExcelImportError("Excel fayl bo'sh", "empty");
  }
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const matrix = XLSX.utils.sheet_to_json<CellValue[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: true,
  });
  if (matrix.length <= 2) {
    throw new ExcelImportError(
      "Excel faylda kamida 3 qator bo'lishi kerak (2 sarlavha + 1 ma'lumot)",
      "too_short",
    );
  }

  const labels = matrix[0] ?? [];
  const keys = matrix[1] ?? [];
  const columnCount = Math.max(labels.length, keys.length, ...matrix.map((r) => r?.length ?? 0));
  const keyMap = detectKeyMap(sheet, range, keys);
  const keysFromMap: CellValue[] = Array.from({ length: columnCount }, (_, i) => {
    const fromMap = keyMap.get(i);
    if (fromMap !== undefined) {
      const raw = keys[i];
      return isYearKey(raw) ? raw : fromMap;
    }
    return keys[i] ?? null;
  });
  const columns = classifyColumns(labels, keysFromMap, columnCount);
  const keySet = new Set<string>();
  keyMap.forEach((k) => keySet.add(normalize(k).replace(/\s+/g, "_")));

  const rows: ParsedExcelRow[] = [];
  for (let i = 2; i < matrix.length; i++) {
    const cells = Array.from({ length: columnCount }, (_, c) => matrix[i]?.[c] ?? null);
    const excelRow = range.s.r + i + 1;
    const empty = cells.every((cell) => isBlank(cell));
    const kind: ImportRowKind = empty ? "empty" : looksLikeHeaderRow(cells, keySet) ? "header" : "data";
    rows.push({
      index: i,
      excelRow,
      cells,
      kind,
      row: kind === "data" ? buildImportRow(cells, columns) : { contract: {}, renter: {} },
    });
  }

  return { fileName: file.name, sheetName, labels, keys: keysFromMap, keyMap, columnCount, columns, rows };
};

/** Jadval ko'rinishi uchun katak matni (sana ustunlari `dd.MM.yyyy`). */
export const formatCellForPreview = (value: CellValue, spec?: ColumnSpec): string => {
  if (isBlank(value)) return "";
  if (value instanceof Date) return formatDate(value);
  if (
    spec?.section === "contract" &&
    spec.field &&
    CONTRACT_DATE_FIELDS.has(spec.field as keyof ImportRowContract) &&
    typeof value === "number"
  ) {
    return excelSerialToDate(value) ?? String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  return collapseText(value);
};

export const chunkArray = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

// ---------------------------------------------------------------------------
// Xatolarni Excel ustuniga bog'lash (billing utils/excelUploadErrors.ts porti)
// ---------------------------------------------------------------------------

export const DEFAULT_SECTION_TITLES: Record<string, string> = {
  contract: "Shartnoma",
  renter: "Ijarachi",
  lands: "Yer turlari",
  activities: "Faoliyat turlari",
  privileges: "Imtiyozlar",
  action: "Bajarilgan ishlar",
  action_products: "Eksport mahsulotlari",
  yearly_amounts: "Yillik summalar",
  umumiy: "Umumiy",
};

/** Backend maydoni → shablondagi kalit (kalitlar qatori). */
const FIELD_TO_EXCEL_KEY: Record<string, Record<string, string>> = {
  contract: {
    xojalik_inn: "department_inn",
    xojalik: "department",
    bolim: "department_branch",
    contract_date: "contract_date",
    expired_date: "expired_date",
    contract_number: "contract_number",
    region: "region_code",
    region_code: "region_code",
    district: "district_code",
    district_code: "district_code",
    circle: "rotation_number",
    section: "quarter_number",
    counter: "contour_number",
    massive: "parcel_number",
    rent_area: "total_leased_land_area_ha",
    rent_amount: "total_calculated",
    paid_amount: "total_paid",
    penalty_amount: "penalty_amount",
    canceled_date: "cancel_date",
    cancel_reason: "cancel_reason",
    latitude: "кенглик",
    longitude: "узунлик",
  },
  renter: {
    pinfl: "pinfl",
    stir: "pinfl",
    full_name: "fio",
    per_adr: "user_address",
    passport: "passport",
    phone: "phone_number",
  },
  action: {
    own_investment: "investment_value_thousand_sum",
    vacancy: "new_jobs_created",
  },
  action_products: {
    product_export: "product_type",
    product_amount: "product_quantity",
    export_amount: "volume_thousand_usd",
  },
};

/** Shablonda kaliti yo'q ustunlar — sarlavhasi bo'yicha. */
const FALLBACK_LABELS: Record<string, string> = {
  cadastral_number: "Кадастр рақами",
  auction_date: "Аукцион ўтказилган сана",
  canceled_date: "Санаси",
  cancel_reason: "Асос",
  xojalik_inn: "СТИР",
  xojalik: "Юридик шахс номи",
  boundary_geojson: "",
  xatolik: "",
  non_field_errors: "",
  id: "",
};

const YEARLY_FIELD_LABELS: Record<string, string> = {
  contract_amount: "shartnoma summasi",
  calculated_amount: "hisoblangan summa",
  paid_amount: "to'langan summa",
  penalty_amount: "penya",
};

export const columnLetter = (index: number): string => {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
};

export interface ExcelColumnIndex {
  byKey: Map<string, number>;
  byLabel: Map<string, number>;
  byTypeName: Map<string, number>;
  labels: CellValue[];
}

export const buildColumnIndex = (parsed: Pick<ParsedExcel, "keyMap" | "labels" | "columns">): ExcelColumnIndex => {
  const byKey = new Map<string, number>();
  parsed.keyMap.forEach((key, idx) => {
    const k = normalize(key);
    if (k && !byKey.has(k)) byKey.set(k, idx);
  });
  const byLabel = new Map<string, number>();
  parsed.labels.forEach((label, idx) => {
    const k = normalize(label);
    if (k && !byLabel.has(k)) byLabel.set(k, idx);
  });
  const byTypeName = new Map<string, number>();
  parsed.columns.forEach((spec) => {
    if (spec.typeName) {
      const k = normalize(spec.typeName);
      if (!byTypeName.has(k)) byTypeName.set(k, spec.index);
    }
  });
  return { byKey, byLabel, byTypeName, labels: parsed.labels };
};

const describeColumn = (section: string, field: string, index: ExcelColumnIndex): string => {
  const excelKey = FIELD_TO_EXCEL_KEY[section]?.[field] ?? field;
  let colIdx = index.byKey.get(normalize(excelKey));
  if (colIdx === undefined) colIdx = index.byTypeName.get(normalize(field));
  if (colIdx === undefined) colIdx = index.byLabel.get(normalize(field));
  if (colIdx === undefined && FALLBACK_LABELS[field]) {
    colIdx = index.byLabel.get(normalize(FALLBACK_LABELS[field]));
  }
  if (colIdx !== undefined) {
    const label = collapseText(index.labels[colIdx]) || excelKey;
    return `«${label}» (${columnLetter(colIdx)} ustun)`;
  }
  const yearly = /^(\d{4})_(.+)$/.exec(field);
  if (yearly) return `${yearly[1]}-yil, ${YEARLY_FIELD_LABELS[yearly[2]] || yearly[2]}`;
  if (field in FALLBACK_LABELS) return FALLBACK_LABELS[field] ? `«${FALLBACK_LABELS[field]}»` : "";
  return `«${field}»`;
};

export const flattenErrorMessage = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(flattenErrorMessage).filter(Boolean).join("; ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${flattenErrorMessage(v)}`)
      .join("; ");
  }
  return String(value);
};

export interface DescribedError {
  section: string;
  column: string;
  message: string;
}

/** `{contract: {xojalik_inn: "..."}, renter: {...}}` → o'qiladigan qatorlar. */
export const describeRowErrors = (
  rowErrors: ContractWriteErrors | string | unknown[] | null | undefined,
  index: ExcelColumnIndex,
  sectionTitles: Record<string, string> = DEFAULT_SECTION_TITLES,
): DescribedError[] => {
  if (!rowErrors) return [];
  if (typeof rowErrors !== "object" || Array.isArray(rowErrors)) {
    return [{ section: "", column: "", message: flattenErrorMessage(rowErrors) }];
  }
  const result: DescribedError[] = [];
  Object.entries(rowErrors).forEach(([section, fields]) => {
    const sectionTitle = sectionTitles[section] || section;
    if (fields && typeof fields === "object" && !Array.isArray(fields)) {
      Object.entries(fields as Record<string, unknown>).forEach(([field, message]) => {
        result.push({
          section: sectionTitle,
          column: describeColumn(section, field, index),
          message: flattenErrorMessage(message),
        });
      });
    } else {
      result.push({ section: sectionTitle, column: "", message: flattenErrorMessage(fields) });
    }
  });
  return result;
};

/** "Excel faylning N-qatori: Bo'lim → «ustun» (K ustun): xabar" */
export const formatDescribedError = (excelRow: number, item: DescribedError, rowPrefix = "Excel faylning"): string => {
  const parts = [`${rowPrefix} ${excelRow}-qatori:`];
  const body = [item.section, item.column].filter(Boolean).join(" → ");
  parts.push(body ? `${body}: ${item.message}` : item.message);
  return parts.join(" ");
};
