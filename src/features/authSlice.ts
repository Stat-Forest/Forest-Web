import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { authApi, User } from "@/services/authApi";
import { eimzoApi } from "@/services/eimzoApi";
import { setAccessToken } from "@/utils/accessToken";
import { removeCookie } from "@/utils/cookie";

interface AuthState {
  // Tokenlarsiz profil (persist qilinadi). access/refresh bu yerda SAQLANMAYDI.
  user: User | null;
  // Access token — faqat xotirada (persist qilinmaydi); sahifa qayta
  // yuklanganda AppWrapper HttpOnly refresh cookie orqali yangisini oladi.
  token: string | null;
}

const initialState: AuthState = { user: null, token: null };

// Login javobidan tokenlarni olib tashlab, faqat profil ma'lumotini saqlaymiz
export const stripTokens = (payload: User): User => {
  const { access: _a, refresh: _r, ...rest } = payload;
  return rest as User;
};

const applyLogin = (state: AuthState, payload: User) => {
  state.token = payload.access ?? null;
  state.user = stripTokens(payload);
  setAccessToken(state.token);
};

// Eski versiya tokenlarni AES "shifrlab" oddiy cookie'ga yozardi — tozalaymiz
const clearLegacyCookies = () => {
  ["token", "user", "refresh"].forEach((name) => removeCookie(name));
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      setAccessToken(null);
      clearLegacyCookies();
    },
    setToken: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.token = action.payload.token;
      state.user = stripTokens(action.payload.user);
      setAccessToken(state.token);
    },
    // Parolni tiklash oqimi: qisqa muddatli pwd_reset access token, profil yo'q
    setAccessOnly: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
      setAccessToken(state.token);
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(authApi.endpoints.login.matchFulfilled, (state, action: PayloadAction<User>) => {
      applyLogin(state, action.payload);
      clearLegacyCookies();
    });
    builder.addMatcher(authApi.endpoints.eimzoLogin.matchFulfilled, (state, action: PayloadAction<User>) => {
      applyLogin(state, action.payload);
      clearLegacyCookies();
    });
    builder.addMatcher(eimzoApi.endpoints.eimzoLogin.matchFulfilled, (state, action: PayloadAction<User>) => {
      applyLogin(state, action.payload);
      clearLegacyCookies();
    });
  },
});

export const { logout, setToken, setAccessOnly } = authSlice.actions;
export default authSlice.reducer;
