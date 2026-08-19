export const departmentTranslationsRu: Record<string, string> = {
  "Inson resurslarini rivojlantirish va boshqarish":
    "Управление и развитие человеческих ресурсов",
  "O'rmon kadastri va monitoringi": "Лесной кадастр и мониторинг",
  "Moliya-iqtisod va buxgalteriya hisobi":
    "Финансово-экономический и бухгалтерский учёт",
  "O'rmonzorlarni barpo etish va Cho'llanishga qarshi kurashish":
    "Лесоразведение и борьба с опустыниванием",
  "O'rmon barpo qilish bo'limi": "Отдел лесоразведения",
  "O'rmonni muhofaza qilish va qo'riqlash": "Охрана и защита леса",
  "Ilmiy-tadqiqot va innovatsiyalar": "Научно-исследовательские работы и инновации",
  "Yer osti boyliklaridan foydalanish va ekologiya":
    "Использование недр и экология",
};

export const statementTranslationsRu: Record<string, string> = {
  "Xodimlar hisobi": "Учёт сотрудников",
  "Yer o'zlashtirish": "Освоение земель",
  "Daromad": "Доход",
  "Ko'chat va Nihol": "Ростки и саженцы",
  "Ko'chat va Nihol Yetishtirish Jami":
    "Всего выращивание ростков и саженцев",
  "Bryusanetta": "Брюсанетта",
  "Golofit": "Голофит",
};

export const translateDepartmentName = (
  name?: string,
  lang?: string,
): string => {
  if (!name) return "";
  if (lang === "ru" && departmentTranslationsRu[name]) {
    return departmentTranslationsRu[name];
  }
  return name;
};

export const translateStatementName = (
  name?: string,
  lang?: string,
): string => {
  if (!name) return "";
  if (lang === "ru" && statementTranslationsRu[name]) {
    return statementTranslationsRu[name];
  }
  return name;
};

export const normalizeReportString = (name?: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[\s\-_'`ʻʼ‘’“”«»]/g, "")
    .trim();
};

export const isPlantReportName = (name?: string): boolean => {
  if (!name) return false;
  const n = normalizeReportString(name);
  return (
    n.includes("kochatvanihol") ||
    n.includes("саженцы") ||
    n.includes("росткиисаженцы") ||
    n.includes("urugxarakati") ||
    n.includes("urugharakati") ||
    n.includes("посевнойматериал") ||
    n.includes("движениесемян") ||
    n.includes("kochatxona") ||
    n.includes("niholxona") ||
    n.includes("питомник") ||
    n.includes("shakl8") ||
    n.includes("форма8") ||
    n.includes("shakl9") ||
    n.includes("форма9") ||
    n.includes("shakl10") ||
    n.includes("форма10") ||
    n.includes("shakl11") ||
    n.includes("форма11") ||
    n.includes("daromad") ||
    n.includes("доход")
  );
};

export const isInnersReportName = (name?: string): boolean => {
  if (!name) return false;
  const n = normalizeReportString(name);
  return (
    n.includes("xuquqbuzarlik") ||
    n.includes("ogirmahalla") ||
    n.includes("трудныйрайон") ||
    n.includes("mexanizatsiya") ||
    n.includes("механизаци") ||
    n.includes("bryusanetta") ||
    n.includes("брюсанетта") ||
    n.includes("golofit") ||
    n.includes("голофит") ||
    n.includes("галофит")
  );
};

export const isLandDocumentsReportName = (
  name?: string,
  id?: string,
): boolean => {
  if (id === "05ec4fd3-6193-4211-9850-f3991be60a62") return true;
  if (!name) return false;
  const n = normalizeReportString(name);
  return n.includes("yerhujjat") || n.includes("земельн");
};

export const isForestAnalysisReportName = (name?: string): boolean => {
  if (!name) return false;
  const n = normalizeReportString(name);
  return n.includes("ormonlarkesimida") || n.includes("разрезелесов");
};
