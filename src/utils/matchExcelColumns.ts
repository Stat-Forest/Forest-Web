/**
 * Import qilingan Excel ustunlarini hisobot ustunlari bilan solishtirish yordamchilari.
 *
 * Excel eksporti ko'p qavatli sarlavhalarga ega ("O'rmon barpo qilish ... / O'rmon
 * bilan qoplangan maydon / jami"), hisobotdagi ustunlar esa `title` va " / " bilan
 * birlashtirilgan `fullParentChain` ga ega. Shu ikkalasini moslashtiramiz.
 */

export interface MatchableColumn {
  id: string;
  title: string;
  fullParentChain: string;
}

/** Katta-kichik harf, apostrof va tire xilma-xilligini yo'qotadi */
export const normalizeExcelText = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[‘’`´ʻʼ]/g, "'")
    .replace(/[«»“”„"]/g, "")
    .replace(/[‐-―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const includesAll = (text: string, words: string[]) =>
  words.every((word) => text.includes(word));

/**
 * Ustunni aniqlashda faqat barg (eng pastki) sarlavha ishlatiladi — yuqoridagi
 * umumiy sarlavhalar ("Export qilingan vaqt", "Shakl-10 ilovasi") xalaqit bermasin.
 */
const leafOf = (chain: string[]) =>
  normalizeExcelText(chain[chain.length - 1] ?? "");

/** "Tashkilot nomi" / "Наименование организации" ustuni */
const isOrganizationHeader = (chain: string[]) => {
  const text = leafOf(chain);
  return (
    includesAll(text, ["tashkilot", "nomi"]) ||
    includesAll(text, ["organizatsiya"]) ||
    includesAll(text, ["организац"])
  );
};



export interface SpecialExcelColumns {
  organizationIndex: number;
  plantIndex: number;
  numberIndex: number;
}

/** Excelning xizmat ustunlarini (№, tashkilot, o'simlik) topadi */
export const findSpecialExcelColumns = (
  headerChains: string[][],
): SpecialExcelColumns => {
  const result: SpecialExcelColumns = {
    organizationIndex: -1,
    plantIndex: -1,
    numberIndex: -1,
  };

  headerChains.forEach((chain, index) => {
    if (result.numberIndex === -1 && isNumberHeader(chain)) {
      result.numberIndex = index;
    } else if (result.organizationIndex === -1 && isOrganizationHeader(chain)) {
      result.organizationIndex = index;
    } else if (result.plantIndex === -1 && isPlantHeader(chain)) {
      result.plantIndex = index;
    }
  });

  return result;
};

/** Xizmat ustunlaridan tashqari (№, tashkilot, o'simlik) hech bo'lmasa bitta qiymati bor qator */
const rowHasData = (cells: string[], skipIndices: number[]) => {
  const skip = new Set(skipIndices.filter((index) => index >= 0));
  return cells.some(
    (cell, index) => !skip.has(index) && String(cell ?? "").trim() !== "",
  );
};

/**
 * Excelning haqiqiy ma'lumot qatorlari: "Jami" qatori ham, faqat nom yozilgan
 * (qiymatsiz) qatorlar ham hisobga olinmaydi — har bir shunday qator alohida
 * formula bo'ladi.
 */
export const getExcelDataRows = <T extends { cells: string[]; isTotal: boolean }>(
  dataRows: T[],
  skipIndices: number[],
): T[] => {
  const withoutTotals = dataRows.filter((row) => !row.isTotal);
  const filled = withoutTotals.filter((row) => rowHasData(row.cells, skipIndices));
  return filled.length > 0 ? filled : withoutTotals;
};

/** Varaq (sheet) uchun kerakli minimal ma'lumot */
export interface ExcelSheetLike {
  name?: string;
  headerChains: string[][];
  dataRows: { cells: string[]; isTotal: boolean }[];
}

/**
 * Fayldagi hamma varaqni qaytaradi. Eski (bitta varaqli) formatdagi obyekt
 * kelsa ham ishlaydi — o'sha bitta varaq qaytariladi.
 */
export const getExcelSheets = (data?: {
  sheets?: ExcelSheetLike[];
  headerChains?: string[][];
  dataRows?: { cells: string[]; isTotal: boolean }[];
}): ExcelSheetLike[] => {
  if (!data) return [];

  const sheets =
    data.sheets && data.sheets.length > 0
      ? data.sheets
      : [
          {
            name: "",
            headerChains: data.headerChains || [],
            dataRows: data.dataRows || [],
          },
        ];

  return sheets.filter(
    (sheet) =>
      (sheet.headerChains || []).length > 0 && (sheet.dataRows || []).length > 0,
  );
};

/** Bitta varaqning hisobot ustunlariga qanchalik mos kelishi */
export interface ExcelSheetMatch<S extends ExcelSheetLike = ExcelSheetLike> {
  sheet: S;
  special: SpecialExcelColumns;
  skipIndices: number[];
  /** hisobot ustuni id -> Excel ustuni indeksi */
  columnToExcel: Record<string, number>;
  /** faqat to'ldirilgan (jami bo'lmagan) qatorlar */
  rows: S["dataRows"];
  /** nechta ustun topilgani — eng mos varaqni tanlash uchun */
  matchedCount: number;
  /** shu ustunlar bo'yicha nechta katakda haqiqiy qiymat borligi */
  filledCount: number;
}

/**
 * Nomlarni solishtirish kaliti: bo'shliq, tire, nuqta va shu kabilar olib tashlanadi.
 * "Ko'chat-ilovasi" (varaq nomi) va "Ko'chat ilovasi" (qadam nomi) bir xil bo'lsin.
 */
export const excelNameKey = (value: unknown): string =>
  normalizeExcelText(value).replace(/[\s\-_.,/\\()]+/g, "");

/**
 * Varaq nomi va qadam nomi bir narsani anglatadimi.
 * Qo'shimchalar farq qilishi mumkin: "Nihol-ilovasi" ↔ "Nihol ilova".
 */
export const excelNamesMatch = (a: unknown, b: unknown): boolean => {
  const first = excelNameKey(a);
  const second = excelNameKey(b);
  if (!first || !second) return false;
  if (first === second) return true;

  return (
    first.length > 3 &&
    second.length > 3 &&
    (first.includes(second) || second.includes(first))
  );
};

/**
 * Har bir varaqni berilgan ustunlar to'plami bilan solishtiradi va eng ko'p
 * ustun topilgan varaqni birinchi qilib qaytaradi.
 *
 * Hisobot ilovalari alohida varaqlarda bo'lganda (Ko'chat-ilovasi, Nihol-ilovasi …)
 * har bir qadam o'z varag'idan to'ldirilishi uchun kerak.
 */
export const matchSheetsToColumns = <S extends ExcelSheetLike>(
  sheets: S[],
  columns: MatchableColumn[],
): ExcelSheetMatch<S>[] =>
  sheets
    .map((sheet) => {
      const special = findSpecialExcelColumns(sheet.headerChains);
      const skipIndices = [
        special.numberIndex,
        special.organizationIndex,
        special.plantIndex,
      ];
      const columnToExcel = matchColumnsToExcel(
        columns,
        sheet.headerChains,
        skipIndices,
      );

      const rows = getExcelDataRows(sheet.dataRows, skipIndices) as S["dataRows"];
      const excelIndices = Object.values(columnToExcel);

      // Sarlavhalari o'xshash, lekin bo'sh varaq (masalan to'ldirilmagan ilova)
      // tanlanib qolmasligi uchun haqiqiy qiymatlarni ham sanaymiz
      const filledCount = rows.reduce(
        (sum, row) =>
          sum +
          excelIndices.filter(
            (index) => String(row.cells[index] ?? "").trim() !== "",
          ).length,
        0,
      );

      return {
        sheet,
        special,
        skipIndices,
        columnToExcel,
        rows,
        matchedCount: Object.keys(columnToExcel).length,
        filledCount,
      };
    })
    .sort((a, b) => b.filledCount - a.filledCount || b.matchedCount - a.matchedCount);

/**
 * Fayldagi to'ldirilgan qatorlar soni — backend javobi to'liqmi yoki yo'qmi,
 * shuni tekshirish uchun ishlatiladi. Bir necha varaq bo'lsa — eng ko'p qatorli
 * varaqniki olinadi (har bir ilova o'z varag'ida bir xil sondagi qatorga ega).
 */
export const countExcelDataRows = (data?: {
  sheets?: ExcelSheetLike[];
  headerChains?: string[][];
  dataRows?: { cells: string[]; isTotal: boolean }[];
}): number => {
  const counts = getExcelSheets(data).map((sheet) => {
    const special = findSpecialExcelColumns(sheet.headerChains);
    return getExcelDataRows(sheet.dataRows, [
      special.numberIndex,
      special.organizationIndex,
      special.plantIndex,
    ]).length;
  });

  return counts.length > 0 ? Math.max(...counts) : 0;
};

/** Faqat alfanumerik belgilardan iborat toza matn yaratadi (apostrof, qavs, tinish belgilarini olib tashlaydi) */
export const cleanTextForSearch = (value: unknown): string =>
  normalizeExcelText(value)
    .replace(/['ʻʼ`’]/g, "")
    .replace(/[^a-z0-9\u0400-\u04FF]/gi, "")
    .toLowerCase();

/** Matnni so'zlarga ajratadi */
const getWords = (str: string): string[] =>
  normalizeExcelText(str)
    .replace(/['ʻʼ`’]/g, "")
    .replace(/[^a-z0-9\u0400-\u04FF]/gi, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);

/** Ikki so'z o'xshashligini tekshiradi (1 ta harf imlo xatosiga chidamli: Jorly vs Joriy) */
const wordsMatch = (w1: string, w2: string): boolean => {
  if (w1 === w2) return true;
  if (w1.length >= 4 && w2.length >= 4) {
    if (w1.includes(w2) || w2.includes(w1)) return true;
    // Levenshtein masofasi <= 1 (masalan Jorly va Joriy)
    if (Math.abs(w1.length - w2.length) <= 1) {
      let diffs = 0;
      const minLen = Math.min(w1.length, w2.length);
      for (let i = 0; i < minLen; i++) {
        if (w1[i] !== w2[i]) diffs++;
        if (diffs > 1) break;
      }
      if (diffs <= 1) return true;
    }
  }
  return false;
};

/** "O'simlik nomi" / "Nihol turi" / "Daromad manbalari" / "Название растения" ustuni */
const isPlantHeader = (chain: string[]) => {
  const text = leafOf(chain);
  const clean = cleanTextForSearch(text);

  // Agar ustun soni, miqdori, hajmi, maydoni yoki narx kabi o'lchov ko'rsatkichi bo'lsa — bu ma'lumot ustuni, o'simlik selecti emas!
  if (
    clean.includes("soni") ||
    clean.includes("miqdor") ||
    clean.includes("hajm") ||
    clean.includes("maydon") ||
    clean.includes("gektar") ||
    clean.includes("dona") ||
    clean.includes("summa") ||
    clean.includes("qiymat") ||
    clean.includes("narx") ||
    clean.includes("foiz") ||
    clean.includes("reja") ||
    clean.includes("amal") ||
    clean.includes("bajaril") ||
    clean.includes("количеств") ||
    clean.includes("штук") ||
    clean.includes("сумм") ||
    clean.includes("объем") ||
    clean.includes("площад")
  ) {
    return false;
  }

  return (
    clean.includes("osimliknomi") ||
    clean.includes("osimlikturi") ||
    clean.includes("kochatturi") ||
    clean.includes("niholturi") ||
    clean.includes("daraxtturi") ||
    clean.includes("daromadmanba") ||
    clean.includes("istochikdoxod") ||
    clean.includes("rasten") ||
    clean === "osimlik" ||
    clean === "kochat" ||
    clean === "nihol" ||
    clean === "daraxt" ||
    clean === "nomi" ||
    clean === "naimenovanie" ||
    clean === "turi" ||
    clean === "daromad" ||
    clean === "manba" ||
    clean === "доход" ||
    clean === "источник"
  );
};

/** "№" / "T/R" tartib raqami ustuni */
const isNumberHeader = (chain: string[]) => {
  const text = leafOf(chain);
  const clean = cleanTextForSearch(text);
  return clean === "№" || clean === "n" || clean === "tr" || clean === "no";
};

/**
 * Ikki sarlavha zanjirining o'xshashlik bahosi.
 * Typos (imlo xatolari) va apostrof xilliklariga chidamli.
 */
const scoreChains = (columnChain: string[], excelChain: string[]): number => {
  if (columnChain.length === 0 || excelChain.length === 0) return 0;

  const columnLeaf = columnChain[columnChain.length - 1];
  const excelLeaf = excelChain[excelChain.length - 1];

  let score = 0;
  if (columnLeaf === excelLeaf) {
    score = 100;
  } else if (cleanTextForSearch(columnLeaf) === cleanTextForSearch(excelLeaf)) {
    score = 95;
  } else {
    // So'zlar bo'yicha fuzzy solishtirish
    const colWords = getWords(columnLeaf);
    const excelWords = getWords(excelLeaf);

    if (colWords.length > 0 && excelWords.length > 0) {
      let matchedCount = 0;
      colWords.forEach((cWord) => {
        if (excelWords.some((eWord) => wordsMatch(cWord, eWord))) {
          matchedCount++;
        }
      });

      const maxLen = Math.max(colWords.length, excelWords.length);
      const matchRatio = matchedCount / maxLen;

      if (matchRatio >= 0.5) {
        score = Math.round(matchRatio * 70) + 15;
      }
    }
  }

  if (score === 0) {
    const colClean = cleanTextForSearch(columnLeaf);
    const excelClean = cleanTextForSearch(excelLeaf);
    if (
      colClean.length > 3 &&
      excelClean.length > 3 &&
      (colClean.includes(excelClean) || excelClean.includes(colClean))
    ) {
      score = 60;
    } else {
      return 0;
    }
  }

  // Ota-sarlavhalar ham mos kelsa — ishonch ortadi
  const columnParents = columnChain.slice(0, -1);
  const excelParents = excelChain.slice(0, -1);

  columnParents.forEach((parent) => {
    const pClean = cleanTextForSearch(parent);
    const matched = excelParents.some((excelParent) => {
      const eClean = cleanTextForSearch(excelParent);
      return (
        pClean === eClean ||
        (pClean.length > 3 &&
          eClean.length > 3 &&
          (eClean.includes(pClean) || pClean.includes(eClean)))
      );
    });
    if (matched) score += 10;
  });

  return score;
};

/**
 * Hisobot ustunlarini Excel ustun indekslariga bog'laydi.
 * Har bir Excel ustuni faqat bitta hisobot ustuniga biriktiriladi (eng yuqori baho bo'yicha).
 */
export const matchColumnsToExcel = (
  columns: MatchableColumn[],
  headerChains: string[][],
  skipIndices: number[] = [],
): Record<string, number> => {
  const skip = new Set(skipIndices.filter((index) => index >= 0));

  const normalizedExcelChains = headerChains.map((chain) =>
    chain.map(normalizeExcelText).filter(Boolean),
  );

  const candidates: { columnId: string; excelIndex: number; score: number }[] =
    [];

  columns.forEach((column) => {
    const chainParts = (column.fullParentChain || column.title)
      .split("/")
      .map(normalizeExcelText)
      .filter(Boolean);

    const columnChain =
      chainParts.length > 0 ? chainParts : [normalizeExcelText(column.title)];

    normalizedExcelChains.forEach((excelChain, excelIndex) => {
      if (skip.has(excelIndex)) return;

      const score = scoreChains(columnChain, excelChain);
      if (score > 0) {
        candidates.push({ columnId: column.id, excelIndex, score });
      }
    });
  });

  candidates.sort((a, b) => b.score - a.score);

  const columnToExcel: Record<string, number> = {};
  const usedExcelIndices = new Set<number>();

  candidates.forEach(({ columnId, excelIndex }) => {
    if (columnToExcel[columnId] !== undefined) return;
    if (usedExcelIndices.has(excelIndex)) return;

    columnToExcel[columnId] = excelIndex;
    usedExcelIndices.add(excelIndex);
  });

  return columnToExcel;
};

/**
 * Nom bo'yicha ro'yxatdan eng mos elementni topadi (toza matn va so'zlar mosligi bilan).
 */
export const findByName = <T>(
  items: T[],
  name: string,
  getName: (item: T) => string,
): T | undefined => {
  const target = normalizeExcelText(name);
  if (!target) return undefined;

  const targetClean = cleanTextForSearch(name);

  // 1. Aniq moslik
  const exact = items.find((item) => normalizeExcelText(getName(item)) === target);
  if (exact) return exact;

  // 2. Apostrof va belgilarsiz toza matn mosligi
  const cleanMatch = items.find(
    (item) => cleanTextForSearch(getName(item)) === targetClean,
  );
  if (cleanMatch) return cleanMatch;

  // 3. Qism matn mosligi
  const partialMatch = items.find((item) => {
    const candidateClean = cleanTextForSearch(getName(item));
    if (!candidateClean || candidateClean.length < 3) return false;
    return candidateClean.includes(targetClean) || targetClean.includes(candidateClean);
  });
  if (partialMatch) return partialMatch;

  // 4. So'zlar to'plami mosligi
  const targetWords = getWords(name);
  if (targetWords.length === 0) return undefined;

  return items.find((item) => {
    const itemWords = getWords(getName(item));
    if (itemWords.length === 0) return false;
    let matchesCount = 0;
    targetWords.forEach((tw) => {
      if (itemWords.some((iw) => wordsMatch(tw, iw))) matchesCount++;
    });
    return matchesCount / Math.max(targetWords.length, itemWords.length) >= 0.5;
  });
};
