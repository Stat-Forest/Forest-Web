import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { base_url, prepareHeaders } from "./baseUrl";

export const sumApi = createApi({
  reducerPath: "sumApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${base_url}/sum`,
    prepareHeaders,
  }),
  tagTypes: ["Reports"],
  endpoints: (builder) => ({
    getIncomeSum: builder.query<any, void>({
      query: () => `/finance-income/`,
    }),
    getEmployeeAnalysisSum: builder.query<any, void>({
      query: () => `/employee-analysis/`,
    }),
    getEmployeeReportSum: builder.query<any, void>({
      query: () => `/employee-report/`,
    }),
    getFinanceFundSum: builder.query<any, void>({
      query: () => `/finance-fund/`,
    }),
    getLandAcquisitionSum: builder.query<any, void>({
      query: () => `/land-acquisition/`,
    }),
  }),
});

export const {
  useGetIncomeSumQuery,
  useGetEmployeeAnalysisSumQuery,
  useGetEmployeeReportSumQuery,
  useGetFinanceFundSumQuery,
  useGetLandAcquisitionSumQuery
} = sumApi;
