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
