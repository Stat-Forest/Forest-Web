import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { getSimpleCookie, setSimpleCookie } from "@/utils/cookie";

import uz from "./languages/uz.json";
import ru from "./languages/ru.json";

// Cookie'dan tilni o'qish (localStorage o'rniga)
const getInitialLanguage = () => {
  // Avval cookie'dan o'qishga harakat qilamiz
  const cookieLang = getSimpleCookie("lang");
  if (cookieLang) {
    return cookieLang;
  }
  
  // Eski localStorage'dan o'qish (migration uchun)
  if (typeof window !== "undefined") {
    const oldLang = localStorage.getItem("lang");
    if (oldLang) {
      setSimpleCookie("lang", oldLang, 365);
      localStorage.removeItem("lang");
      return oldLang;
    }
  }
  
  return "uz";
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru },
    },
    lng: getInitialLanguage(),
    fallbackLng: "uz",
    interpolation: {
      escapeValue: false,
    },
  });

// i18n til o'zgarganda cookie'ga saqlash
i18n.on("languageChanged", (lng) => {
  setSimpleCookie("lang", lng, 365);
});

export default i18n;
