import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { base_url, prepareHeaders } from "./baseUrl";

export const statistikApi = createApi({
  reducerPath: "statistikApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${base_url}/statistics`,
    prepareHeaders,
  }),
  tagTypes: ["Reports"],
  endpoints: (builder) => ({
    getEmployeeIncomeStat: builder.query<any, void>({
      query: () => `/finance-income-stat/`,
    }),
    getEmployeeReportStat: builder.query<any, void>({
      query: () => `/employee-report-stat/`,
    }),
    getEmployeeFundStat: builder.query<any, void>({
      query: () => `/finance-fund-stat/`,
    }),
    getEmployeeAnalysisStat: builder.query<any, void>({
      query: () => `/employee-analysis-stat/`,
    }),
    getLandForest: builder.query<any, void>({
      query: () => `/land-forest-stat/`,
    }),
    getLandAcquisition: builder.query<any, void>({
      query: () => `/land-acquisition-stat/`,
    }),
    getLandRented: builder.query<any, void>({
      query: () => `/land-rented-stat/`,
    }),
  }),
});

export const {
  useGetEmployeeAnalysisStatQuery,
  useGetEmployeeFundStatQuery,
  useGetEmployeeIncomeStatQuery,
  useGetEmployeeReportStatQuery,
  useGetLandAcquisitionQuery,
  useGetLandForestQuery,
  useGetLandRentedQuery,
} = statistikApi;
