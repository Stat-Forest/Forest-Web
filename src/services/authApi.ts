import {
  createApi,
  fetchBaseQuery,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { base_url, prepareHeaders } from "./baseUrl";
import { encryptData, decryptData } from "@/utils/crypto";
import { logout } from "@/features/authSlice";

export interface User {
  email: string;
  user_id: string;
  role: string;
  access: string;
  refresh: string;
}

// Login response
interface LoginResponse extends User {}

// Refresh response
interface RefreshResponse {
  access: string;
}

// VerifyCode response
export interface VerifyCodeResponse {
  access: string;
  refresh: string;
}

// ChangePassword response
interface ChangePasswordResponse {
  message: string;
}

// SendEmail response
interface SendEmailResponse {
  message: string;
}

// SetNewPassword response
interface SetNewPasswordResponse {
  message: string;
}

// Oddiy baseQuery
const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${base_url}/authentications`,
  prepareHeaders,
});

// Refresh bilan custom baseQuery
const baseQueryWithReauth = async (
  args: string | FetchArgs,
  api: any,
  extraOptions: any
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && (result.error as FetchBaseQueryError).status === 401) {
    const user = decryptData("user", "user") as User | null;
    const refreshToken = user?.refresh;

    if (refreshToken) {
      // Refresh token yuborish
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

        // Userni yangilash
        const updatedUser: User = { ...(user as User), access: newAccess };
        encryptData("token", newAccess, "token");
        encryptData("user", updatedUser, "user");

        // Retry original request
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logout());
      }
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
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
    refreshToken: builder.mutation<RefreshResponse, { refresh: string }>({
      query: (data) => ({
        url: "/token/refresh/",
        method: "POST",
        body: data,
      }),
    }),

    // ✅ E-IMZO login
    eimzoLogin: builder.mutation<LoginResponse, any>({
      query: (data) => ({
        url: "/login/eimzo/",
        method: "POST",
        body: data,
      }),
    }),

    // ✅ Parolni o‘zgartirish
    changePassword: builder.mutation<
      ChangePasswordResponse,
      { old_password: string; new_password: string }
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

    // ✅ Yangi parol o‘rnatish
    setNewPassword: builder.mutation<
      SetNewPasswordResponse,
      { email: string; password: string; code: string }
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
  useLoginMutation,
  useRefreshTokenMutation,
  useEimzoLoginMutation,
  useChangePasswordMutation,
  useGetUserProfileQuery,
  useSendEmailMutation,
  useVerifyCodeMutation,
  useSetNewPasswordMutation,
} = authApi;
