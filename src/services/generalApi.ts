import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { base_url, prepareHeaders } from "./baseUrl";

export const generalApi = createApi({
  reducerPath: "generalApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${base_url}/general`,
    prepareHeaders,
  }),
  endpoints: (builder) => ({
    // ==== ✅ GET endpoints ====
    getOrganizationReports: builder.query<any, { lang: string }>({
      query: ({ lang }) => `/organization/?lang=${lang}`,
    }),
    getAnnouncementsReports: builder.query<any, { lang: string }>({
      query: ({ lang }) => `/announcements/?lang=${lang}`,
    }),
    getNotificationReports: builder.query<any, { lang: string }>({
      query: ({ lang }) => `/notifications/?lang=${lang}`,
    }),
    getLandDocumentsReports: builder.query<
      any,
      { ordering: string; page: number; per_page: number; search: string }
    >({
      query: ({ ordering, page, per_page, search }) =>
        `/land-documents/?ordering=${ordering}&page=${page}&per_page=${per_page}&search=${search}`,
    }),
  }),
});

export const {
  // GET
  useGetOrganizationReportsQuery,
  useGetAnnouncementsReportsQuery,
  useGetNotificationReportsQuery,
  useGetLandDocumentsReportsQuery,
} = generalApi;
