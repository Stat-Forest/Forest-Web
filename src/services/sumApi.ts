import { createApi } from "@reduxjs/toolkit/query/react";
import { base_url } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";

export const sumApi = createApi({
  reducerPath: "sumApi",
  baseQuery: createBaseQueryWithReauth(`${base_url}/sum`),
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
