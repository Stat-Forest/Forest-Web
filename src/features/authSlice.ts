import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { authApi } from "@/services/authApi";
import { encryptData, decryptData } from "@/utils/crypto";

interface User {
  email: string;
  user_id: string;
  role: string;
  access: string;
  refresh: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
}

const initialState: AuthState = {
  user: (decryptData("user", "user") as User) || null,
  token: (decryptData("token", "token") as string) || null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
  extraReducers: (builder) => {
    // Oddiy login
    builder.addMatcher(
      authApi.endpoints.login.matchFulfilled,
      (state, action: PayloadAction<any>) => {
        const payload = action.payload;
        state.token = payload.access;
        state.user = {
          email: payload.email,
          user_id: payload.user_id,
          role: payload.role,
          access: payload.access,
          refresh: payload.refresh,
        };
        encryptData("token", payload.access, "token");
        encryptData("user", payload, "user");
      }
    );

    // EIMZO login
    builder.addMatcher(
      authApi.endpoints.eimzoLogin.matchFulfilled,
      (state, action: PayloadAction<any>) => {
        const payload = action.payload;
        state.token = payload.access;
        state.user = {
          email: payload.email,
          user_id: payload.user_id,
          role: payload.role,
          access: payload.access,
          refresh: payload.refresh,
        };
        encryptData("token", payload.access, "token");
        encryptData("user", payload, "user");
      }
    );
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
