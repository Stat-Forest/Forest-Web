import { authApi } from "@/services/authApi";
import { decryptData, encryptData } from "@/utils/crypto";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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
        console.log(payload.access);
        encryptData("user", payload, "user");
        console.log(payload);
      }
    );
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
