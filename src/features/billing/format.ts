// Ijara billing — pul / maydon / sana formatlash yordamchilari.

export type NumberLike = number | string | null | undefined;

/** "1 234,50" / "1234.50" / 1234.5 → 1234.5; bo'sh yoki noto'g'ri → 0. */
export const toNumber = (value: NumberLike): number => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value).replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** `toNumber` kabi, lekin bo'sh qiymat uchun `null` qaytaradi. */
export const toNumberOrNull = (value: NumberLike): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = toNumber(value);
  return Number.isFinite(n) ? n : null;
};

const uzNumber = new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 });
const uzDecimal = new Intl.NumberFormat("uz-UZ", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Butun so'mga yaxlitlab, `uz-UZ` guruhlash bilan: 1 234 567 */
export const formatNumber = (value: NumberLike): string =>
  uzNumber.format(Math.round(toNumber(value)));

/** 2 kasrgacha: 12 345,67 */
export const formatDecimal = (value: NumberLike): string =>
  uzDecimal.format(Math.round(toNumber(value) * 100) / 100);

/** 1 234 567 so'm (billing'dagi `moneyFmt` + "so'm"). */
export const formatMoney = (value: NumberLike, suffix = "so'm"): string =>
  `${formatNumber(value)}${suffix ? ` ${suffix}` : ""}`;

/** Qarzdorlik: + / - belgisi bilan (musbat qarz → "- N so'm"). */
export const formatDebt = (value: NumberLike): string => {
  const debt = toNumber(value);
  if (debt > 0) return `- ${formatMoney(debt)}`;
  if (debt < 0) return `+ ${formatMoney(Math.abs(debt))}`;
  return "0 so'm";
};

/** Maydon (ga): 12,35 ga */
export const formatArea = (value: NumberLike, suffix = "ga"): string =>
  `${formatDecimal(value)}${suffix ? ` ${suffix}` : ""}`;

export const formatCoord = (value: number): string =>
  (Math.round(value * 1e7) / 1e7).toString();

const pad2 = (n: number) => String(n).padStart(2, "0");

const DMY_RE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * `dd.mm.yyyy`, `yyyy-mm-dd`, ISO datetime yoki Date → Date (mahalliy vaqt).
 * Noto'g'ri → null.
 */
export const parseDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;

  const dmy = s.match(DMY_RE);
  if (dmy) {
    // "dd.mm.yyyy HH:MM[:SS]" (backend DATETIME_FORMAT) — vaqt qismini ham saqlaymiz
    const time = s.slice(dmy[0].length).match(/^[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    const d = new Date(
      Number(dmy[3]),
      Number(dmy[2]) - 1,
      Number(dmy[1]),
      time ? Number(time[1]) : 0,
      time ? Number(time[2]) : 0,
      time && time[3] ? Number(time[3]) : 0,
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = s.match(ISO_RE);
  if (iso) {
    // Faqat sana bo'lsa — mahalliy; vaqt bilan bo'lsa — standart parse
    if (s.length === 10) {
      const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** → `dd.MM.yyyy`; parse bo'lmasa — asl matn (yoki bo'sh). */
export const formatDate = (value: string | Date | null | undefined, fallback = ""): string => {
  const d = parseDate(value);
  if (!d) return value ? String(value) : fallback;
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/** → `dd.MM.yyyy HH:mm` */
export const formatDateTime = (value: string | Date | null | undefined, fallback = ""): string => {
  const d = parseDate(value);
  if (!d) return value ? String(value) : fallback;
  return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/** → `yyyy-MM-dd` (HTML `<input type="date">` uchun). */
export const toInputDate = (value: string | Date | null | undefined): string => {
  const d = parseDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/** `<input type="date">` qiymatini (yyyy-mm-dd) backend `dd.mm.yyyy` ga. */
export const toApiDate = (value: string | Date | null | undefined): string => {
  const d = parseDate(value);
  return d ? formatDate(d) : "";
};

/** Bugungi sana `dd.MM.yyyy`. */
export const todayApiDate = (): string => formatDate(new Date());

/** Ikki sana orasidagi kunlar (b - a). */
export const diffDays = (a: Date, b: Date): number =>
  Math.round((b.getTime() - a.getTime()) / 86_400_000);

/** Fayl nomi uchun `YYYYMMDD-HHMM`. */
export const fileTimestamp = (d = new Date()): string =>
  `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;

/** INN/STIR — 9 raqam. */
export const isValidStir = (value: string): boolean => /^\d{9}$/.test(value.trim());
/** JSHSHIR/PINFL — 14 raqam. */
export const isValidPinfl = (value: string): boolean => /^\d{14}$/.test(value.trim());
