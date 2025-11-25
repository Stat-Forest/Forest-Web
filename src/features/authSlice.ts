import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { authApi, User } from "@/services/authApi";
import { encryptData, decryptData } from "@/utils/crypto";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

// LocalStorage'dan ma'lumotlarni yuklash
const getInitialState = (): AuthState => {
  try {
    const user = decryptData("user", "user") as User | null;
    const token = decryptData("token", "token") as string | null;

    return {
      user: user || null,
      token: token || null,
      isLoading: false,
      error: null,
    };
  } catch (error) {
    console.error("LocalStorage'dan ma'lumot o'qishda xatolik:", error);
    return {
      user: null,
      token: null,
      isLoading: false,
      error: null,
    };
  }
};

const initialState: AuthState = getInitialState();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // ✅ Logout
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isLoading = false;
      state.error = null;

      // LocalStorage tozalash
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch (error) {
        console.error("LocalStorage tozalashda xatolik:", error);
      }
    },

    // ✅ Token yangilash
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      if (state.user) {
        state.user.access = action.payload;
      }

      // LocalStorage yangilash
      try {
        encryptData("token", action.payload, "token");
        if (state.user) {
          encryptData("user", state.user, "user");
        }
      } catch (error) {
        console.error("LocalStorage yangilashda xatolik:", error);
      }
    },

    // ✅ User ma'lumotlarini yangilash
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;

      // LocalStorage yangilash
      try {
        encryptData("user", action.payload, "user");
      } catch (error) {
        console.error("LocalStorage yangilashda xatolik:", error);
      }
    },

    // ✅ Loading holatini o'zgartirish
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // ✅ Xatolikni o'rnatish
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // ✅ Auth state tozalash
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // ✅ Login pending
      .addMatcher(authApi.endpoints.login.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      // ✅ Login fulfilled
      .addMatcher(
        authApi.endpoints.login.matchFulfilled,
        (state, action: PayloadAction<User>) => {
          const payload = action.payload;
          state.isLoading = false;
          state.error = null;
          state.token = payload.access;
          state.user = payload;

          // LocalStorage saqlash
          try {
            encryptData("token", payload.access, "token");
            encryptData("user", payload, "user");
          } catch (error) {
            console.error("LocalStorage saqlashda xatolik:", error);
            state.error = "Ma'lumotlarni saqlashda xatolik";
          }
        }
      )
      // ✅ Login rejected
      .addMatcher(authApi.endpoints.login.matchRejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error?.message || "Login failed";
      })

      // ✅ E-IMZO login pending
      .addMatcher(authApi.endpoints.eimzoLogin.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      // ✅ E-IMZO login fulfilled
      .addMatcher(
        authApi.endpoints.eimzoLogin.matchFulfilled,
        (state, action: PayloadAction<User>) => {
          const payload = action.payload;
          state.isLoading = false;
          state.error = null;
          state.token = payload.access;
          state.user = payload;

          // LocalStorage saqlash
          try {
            encryptData("token", payload.access, "token");
            encryptData("user", payload, "user");
          } catch (error) {
            console.error("LocalStorage saqlashda xatolik:", error);
            state.error = "Ma'lumotlarni saqlashda xatolik";
          }
        }
      )
      // ✅ E-IMZO login rejected
      .addMatcher(
        authApi.endpoints.eimzoLogin.matchRejected,
        (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message || "E-IMZO login failed";
        }
      )

      // ✅ Refresh token fulfilled
      .addMatcher(
        authApi.endpoints.refreshToken.matchFulfilled,
        (state, action: PayloadAction<any>) => {
          if (state.user) {
            state.token = action.payload.access;
            state.user.access = action.payload.access;

            // LocalStorage yangilash
            try {
              encryptData("token", action.payload.access, "token");
              encryptData("user", state.user, "user");
            } catch (error) {
              console.error("LocalStorage yangilashda xatolik:", error);
            }
          }
        }
      );
  },
});

export const { logout, setToken, setUser, setLoading, setError, clearAuth } =
  authSlice.actions;

export default authSlice.reducer;
