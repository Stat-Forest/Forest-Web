import { createApi } from "@reduxjs/toolkit/query/react";
import { base_url } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";

export const statistikApi = createApi({
  reducerPath: "statistikApi",
  baseQuery: createBaseQueryWithReauth(`${base_url}/statistics`),
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
    getBuildForestGolofitStat: builder.query<any, void>({
      query: () => `/build-forest-golofit/`,
    }),
    getBuildForestTeressaStat: builder.query<any, void>({
      query: () => `/build-forest-teressa/`,
    }),
    getMonitorForestUzlashtirish: builder.query<any, void>({
      query: () => `/monitor-forest-uzlashtirish/`,
    }),
    getProtectForestZararkunanda: builder.query<any, void>({
      query: () => `/protect-forest-zararkunanda/`,
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
  useGetBuildForestGolofitStatQuery,
  useGetBuildForestTeressaStatQuery,
  useGetMonitorForestUzlashtirishQuery,
  useGetProtectForestZararkunandaQuery,
} = statistikApi;
