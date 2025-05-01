import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { base_url, prepareHeaders } from "./baseUrl";

// const prepareHeaders = (headers: Headers) => {
//   const token = decryptData("token", "token");
// const user = decryptData("user", "user");

//   if (token) {
//     headers.set("Authorization", `Bearer ${token}`);
//   }

//   return headers;
// };

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${base_url}/authentications`, // This uses the imported base_url
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
    getUserProfile: builder.query({
      query: () => ({
        url: "/profile/",
        method: "GET",
      }),
    }),
  }),
});

export const { useLoginMutation, useGetUserProfileQuery } = authApi;
