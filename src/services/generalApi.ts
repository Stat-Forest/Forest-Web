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
    getOrganizationReports: builder.query<any, {lang:string}>({
      query: ({lang}) => `/organization/?lang=${lang}`,
    }),
    getAnnouncementsReports: builder.query<any, {lang:string}>({
      query: ({lang}) => `/announcements/?lang=${lang}`,
    }),
  }),
});

export const {
  // GET
  useGetOrganizationReportsQuery,
  useGetAnnouncementsReportsQuery,
} = generalApi;
