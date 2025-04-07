import { authApi } from "@/services/authApi";
import { decryptData, encryptData } from "@/utils/crypto";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
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
          id: payload.user_id,
          name: payload.full_name,
          username: payload.email,
          role: payload.role,
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
