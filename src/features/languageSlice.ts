import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getSimpleCookie, setSimpleCookie } from "@/utils/cookie";

interface LanguageState {
  lang: string;
}

// Cookie'dan tilni o'qish, mavjud bo'lmasa "uz" qaytarish
const getInitialLanguage = (): string => {
  // Avval cookie'dan o'qishga harakat qilamiz
  const savedLang = getSimpleCookie("lang");
  if (savedLang) {
    return savedLang;
  }
  
  // Eski localStorage'dan o'qish (migration uchun)
  if (typeof window !== "undefined") {
    const oldLang = localStorage.getItem("lang");
    if (oldLang) {
      setSimpleCookie("lang", oldLang, 365); // 1 yil muddat
      localStorage.removeItem("lang");
      return oldLang;
    }
  }
  
  // Agar hech qanday til saqlanmagan bo'lsa, "uz" ni default qil
  setSimpleCookie("lang", "uz", 365); // 1 yil muddat
  return "uz";
};

const initialState: LanguageState = {
  lang: getInitialLanguage(),
};

export const languageSlice = createSlice({
  name: "language",
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<string>) => {
      state.lang = action.payload;
      setSimpleCookie("lang", action.payload, 365); // 1 yil muddat
      // Eski localStorage'dan ham o'chiramiz (migration uchun)
      if (typeof window !== "undefined") {
        localStorage.removeItem("lang");
      }
    },
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;