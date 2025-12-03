import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { base_url, prepareHeaders } from "./baseUrl";

export const generalApi = createApi({
  reducerPath: "generalApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${base_url}/general`,
    prepareHeaders,
  }),
  tagTypes: ["Reports"],
  endpoints: (builder) => ({
    // ==== ✅ GET endpoints ====
    getOrganizationReports: builder.query<any, { lang: string }>({
      query: ({ lang }) => `/organization/?lang=${lang}`,
      providesTags: ["Reports"],
    }),
    getAnnouncementsReports: builder.query<any, { lang: string }>({
      query: ({ lang }) => `/announcements/?lang=${lang}`,
      providesTags: ["Reports"],
    }),
    getNotificationReports: builder.query<any, { lang: string }>({
      query: ({ lang }) => `/notifications/?lang=${lang}`,
      providesTags: ["Reports"],
    }),
    getLandDocumentsReports: builder.query<
      any,
      { ordering: string; page: number; per_page: number; search: string }
    >({
      query: ({ ordering, page, per_page, search }) =>
        `/land-documents/?ordering=${ordering}&page=${page}&per_page=${per_page}&search=${search}`,
      providesTags: ["Reports"],
    }),

    landDocumentCreate: builder.mutation({
      query: (payload) => ({
        url: `/land-documents/`,
        method: "POST",
        body: payload, // payload bu FormData bo'lishi kerak
      }),
      invalidatesTags: ["Reports"],
    }),
  }),
});

export const {
  // GET
  useGetOrganizationReportsQuery,
  useGetAnnouncementsReportsQuery,
  useGetNotificationReportsQuery,
  useGetLandDocumentsReportsQuery,
  useLandDocumentCreateMutation
} = generalApi;
