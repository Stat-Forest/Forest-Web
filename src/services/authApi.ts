import {
  createApi,
} from "@reduxjs/toolkit/query/react";
import { base_url } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";

export interface User {
  email: string;
  user_id: number | string;
  role: string;
  // Tokenlar faqat login javobida keladi; Redux/persist'da saqlanmaydi (audit A5)
  access?: string;
  refresh?: string;
  full_name?: string;
  organization?: string;
  is_new_user?: boolean;
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

export const authApi = createApi({
  reducerPath: "authApi",
  // BaseQuery for authApi with authentications baseUrl
  // Lazy initialization - circular dependency'ni oldini olish uchun
  baseQuery: createBaseQueryWithReauth(`${base_url}/authentications`),
  endpoints: (builder) => ({
    // ✅ Login
    login: builder.mutation<LoginResponse, { email: string; password: string }>(
      {
        query: (credentials) => ({
          url: "/login/",
          method: "POST",
          body: credentials,
        }),
      }
    ),

    // ✅ Refresh token
    // Backend: access token darhol bekor qilinadi, refresh blacklist'ga tushadi
    // Refresh token HttpOnly cookie'da — brauzer o'zi yuboradi (credentials: include)
    logout: builder.mutation<void, void>({
      query: () => ({ url: "/logout/", method: "POST", body: {}, credentials: "include" }),
    }),
    refreshToken: builder.mutation<RefreshResponse, void>({
      query: () => ({
        url: "/token/refresh/",
        method: "POST",
        body: {},
        credentials: "include",
      }),
    }),

    // ✅ E-imzo / USB-token login — both use e-imzo endpoint
    // E-imzo (pfx): { pkcs7, vo }
    // USB-token (ftjc): { pkcs7, vo }
    eimzoLogin: builder.mutation<LoginResponse, any>({
      query: (data) => ({
        url: "/login/eimzo/",
        method: "POST",
        body: data,
      }),
    }),

    // ✅ Parolni o‘zgartirish (confirm_password qo‘shildi)
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

    // ✅ Profil
    getUserProfile: builder.query<User, void>({
      query: () => ({
        url: "/profile/",
        method: "GET",
      }),
    }),

    // ✅ Email yuborish
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

    // ✅ Yangi parol o‘rnatish (email + code majburiy qildim)
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
  }),
});

export const {
  useLogoutMutation,
  useLoginMutation,
  useRefreshTokenMutation,
  useEimzoLoginMutation,
  useChangePasswordMutation,
  useGetUserProfileQuery,
  useSendEmailMutation,
  useVerifyCodeMutation,
  useSetNewPasswordMutation,
} = authApi;
