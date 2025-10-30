import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface LanguageState {
  lang: string;
}

// localStorage'dan tilni o'qish, mavjud bo'lmasa "uz" qaytarish
const getInitialLanguage = (): string => {
  const savedLang = localStorage.getItem("lang");
  if (savedLang) {
    return savedLang;
  }
  
  // Agar localStorage'da til saqlanmagan bo'lsa, "uz" ni default qil
  localStorage.setItem("lang", "uz");
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
      localStorage.setItem("lang", action.payload);
    },
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;