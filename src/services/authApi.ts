import {
  createApi,
  fetchBaseQuery,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { base_url, prepareHeaders } from "./baseUrl";
import { encryptData, decryptData } from "@/utils/crypto";
import { logout, setToken, setUser } from "@/features/authSlice";

export interface User {
  email: string;
  user_id: string;
  role: string;
  access: string;
  refresh: string;
}

// ✅ Login response
interface LoginResponse extends User {}

// ✅ Refresh response
interface RefreshResponse {
  access: string;
}

// ✅ VerifyCode response
export interface VerifyCodeResponse {
  access: string;
  refresh: string;
}

// ✅ ChangePassword response
interface ChangePasswordResponse {
  message: string;
}

// ✅ SendEmail response
interface SendEmailResponse {
  message: string;
}

// ✅ SetNewPassword response
interface SetNewPasswordResponse {
  message: string;
}

// --- BaseQuery ---
const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${base_url}/authentications`,
  prepareHeaders,
  timeout: 10000,
});

// --- Refresh bilan custom baseQuery ---
const baseQueryWithReauth = async (
  args: string | FetchArgs,
  api: any,
  extraOptions: any
) => {
  // Avval original so'rovni yuboramiz
  let result = await rawBaseQuery(args, api, extraOptions);

  // Agar 401 xatolik bo'lsa va token eskirgan bo'lsa
  if (result.error && (result.error as FetchBaseQueryError).status === 401) {
    console.log("Token eskirgan, yangilash urinilyapti...");

    // LocalStorage'dan user ma'lumotlarini olamiz
    const user = decryptData("user", "user") as User | null;
    const refreshToken = user?.refresh;

    if (refreshToken) {
      try {
        // Refresh token bilan yangi access token so'raymiz
        const refreshResult = await rawBaseQuery(
          {
            url: "/token/refresh/",
            method: "POST",
            body: { refresh: refreshToken },
          },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          const newAccess = (refreshResult.data as RefreshResponse).access;
          console.log("Yangi token olindi");

          // Yangi tokenni saqlaymiz
          const updatedUser: User = {
            ...(user as User),
            access: newAccess,
          };

          // LocalStorage yangilash
          encryptData("token", newAccess, "token");
          encryptData("user", updatedUser, "user");

          // Redux state yangilash
          api.dispatch(setToken(newAccess));
          api.dispatch(setUser(updatedUser));

          // Original so'rovni yangi token bilan qayta urinamiz
          result = await rawBaseQuery(args, api, extraOptions);
          console.log("Original so'rov qayta urinildi");
        } else {
          // Agar refresh token ham ishlamasa, logout qilamiz
          console.error("Refresh token ham eskirgan, logout qilinmoqda");
          api.dispatch(logout());
        }
      } catch (refreshError) {
        console.error("Token yangilashda xatolik:", refreshError);
        api.dispatch(logout());
      }
    } else {
      // Agar refresh token topilmasa, logout qilamiz
      console.error("Refresh token topilmadi, logout qilinmoqda");
      api.dispatch(logout());
    }
  }

  return result;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["User", "Auth"],
  endpoints: (builder) => ({
    // ✅ Login
    login: builder.mutation<LoginResponse, { email: string; password: string }>(
      {
        query: (credentials) => ({
          url: "/login/",
          method: "POST",
          body: credentials,
        }),
        invalidatesTags: ["User", "Auth"],
      }
    ),

    // ✅ Refresh token (faqat manual chaqirish uchun)
    refreshToken: builder.mutation<RefreshResponse, { refresh: string }>({
      query: (data) => ({
        url: "/token/refresh/",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Auth"],
    }),

    // ✅ E-IMZO login
    eimzoLogin: builder.mutation<LoginResponse, any>({
      query: (data) => ({
        url: "/login/eimzo/",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User", "Auth"],
    }),

    // ✅ Parolni o'zgartirish
    changePassword: builder.mutation<
      ChangePasswordResponse,
      { old_password: string; new_password: string; confirm_password: string }
    >({
      query: (credentials) => ({
        url: "/change-password/",
        method: "POST",
        body: credentials,
      }),
    }),

    // ✅ Profil ma'lumotlarini olish
    getUserProfile: builder.query<User, void>({
      query: () => ({
        url: "/profile/",
        method: "GET",
      }),
      providesTags: ["User"],
    }),

    // ✅ Email yuborish (parolni unutganlar uchun)
    sendEmail: builder.mutation<SendEmailResponse, { email: string }>({
      query: (email) => ({
        url: "/forgot-password/send-code/",
        method: "POST",
        body: email,
      }),
    }),

    // ✅ Kodni tekshirish
    verifyCode: builder.mutation<
      VerifyCodeResponse,
      { email: string; code: string }
    >({
      query: (data) => ({
        url: "/forgot-password/verify-code/",
        method: "POST",
        body: data,
      }),
    }),

    // ✅ Yangi parol o'rnatish
    setNewPassword: builder.mutation<
      SetNewPasswordResponse,
      {
        email: string;
        password: string;
        confirm_password: string;
        code: string;
      }
    >({
      query: (data) => ({
        url: "/forgot-password/new-password/",
        method: "POST",
        body: data,
      }),
    }),

    // ✅ Logout (optional - agar backendda logout endpoint bo'lsa)
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/logout/",
        method: "POST",
      }),
      invalidatesTags: ["User", "Auth"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshTokenMutation,
  useEimzoLoginMutation,
  useChangePasswordMutation,
  useGetUserProfileQuery,
  useSendEmailMutation,
  useVerifyCodeMutation,
  useSetNewPasswordMutation,
  useLogoutMutation,
} = authApi;
