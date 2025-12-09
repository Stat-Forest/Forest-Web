import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { authApi, User } from "@/services/authApi";
import { encryptData, decryptData, removeEncryptedData } from "@/utils/crypto";

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
      // Cookie'lardan ma'lumotlarni tozalaymiz
      removeEncryptedData("token");
      removeEncryptedData("user");
      removeEncryptedData("refresh");
    },
    setToken: (
      state,
      action: PayloadAction<{ token: string; user: User }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
  },
  extraReducers: (builder) => {
    // Oddiy login
    builder.addMatcher(
      authApi.endpoints.login.matchFulfilled,
      (state, action: PayloadAction<User>) => {
        const payload = action.payload;
        state.token = payload.access;
        state.user = payload;
        // Xavfsiz cookie'ga saqlaymiz (30 kun muddat)
        encryptData("token", payload.access, "token", 30);
        encryptData("user", payload, "user", 30);
      }
    );

    // EIMZO login
    builder.addMatcher(
      authApi.endpoints.eimzoLogin.matchFulfilled,
      (state, action: PayloadAction<User>) => {
        const payload = action.payload;
        state.token = payload.access;
        state.user = payload;
        // Xavfsiz cookie'ga saqlaymiz (30 kun muddat)
        encryptData("token", payload.access, "token", 30);
        encryptData("user", payload, "user", 30);
      }
    );
  },
});

export const { logout, setToken } = authSlice.actions;
export default authSlice.reducer;
