import { createApi } from "@reduxjs/toolkit/query/react";
import { base_url } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";

export const eimzoApi = createApi({
  reducerPath: "eimzoApi",
  // BaseQuery for authApi with authentications baseUrl
  // Lazy initialization - circular dependency'ni oldini olish uchun
  baseQuery: createBaseQueryWithReauth(`${base_url}/e_imzo`),
  endpoints: (builder) => ({
    // ✅ E-imzo / USB-token login — both use e-imzo endpoint
    // E-imzo (pfx): { pkcs7, vo }
    // USB-token (ftjc): { pkcs7, vo }
    // Imzolanadigan matn — server bergan bir martalik challenge (audit B1)
    getChallenge: builder.query<{ success: boolean; challenge: string }, void>({
      query: () => ({ url: "/challenge/" }),
    }),
    eimzoLogin: builder.mutation<any, { pkcs7: string; challenge: string }>({
      query: (data) => ({
        url: "/login/",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const { useEimzoLoginMutation, useLazyGetChallengeQuery } = eimzoApi;
