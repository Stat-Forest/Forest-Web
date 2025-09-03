import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { base_url, prepareHeaders } from "./baseUrl";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${base_url}/authentications`,
    prepareHeaders,
  }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: "/login/",
        method: "POST",
        body: credentials,
      }),
    }),
    eimzoLogin: builder.mutation({
      query: (data) => ({
        url: "/login/eimzo/",
        method: "POST",
        body: data,
      }),
    }),
    changePassword: builder.mutation({
      query: (credentials) => ({
        url: "/change-password/",
        method: "POST",
        body: credentials,
      }),
    }),
    getUserProfile: builder.query({
      query: () => ({
        url: "/profile/",
        method: "GET",
      }),
    }),
    sendEmail: builder.mutation({
      query: (email) => ({
        url: "/forgot-password/send-code/",
        method: "POST",
        body: email,
      }),
    }),
    verifyCode: builder.mutation({
      query: (data) => ({
        url: "/forgot-password/verify-code/",
        method: "POST",
        body: data,
      }),
    }),
    setNewPassword: builder.mutation({
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
  useEimzoLoginMutation,
  useChangePasswordMutation,
  useGetUserProfileQuery,
  useSendEmailMutation,
  useVerifyCodeMutation,
  useSetNewPasswordMutation,
} = authApi;
