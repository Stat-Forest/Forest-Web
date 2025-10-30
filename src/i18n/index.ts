import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import uz from "./languages/uz.json";
import ru from "./languages/ru.json";

// localStorage'dan tilni o'qish
const getInitialLanguage = () => {
  return localStorage.getItem("lang") || "uz";
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru },
    },
    lng: getInitialLanguage(), // ✅ Bu muhim - boshlang'ich tilni aniq belgilash
    fallbackLng: "uz",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"], // localStorage birinchi tekshirilsin
      lookupLocalStorage: "lang", // localStorage'dagi kalit nomi
      caches: ["localStorage"],
    },
  });

export default i18n;
