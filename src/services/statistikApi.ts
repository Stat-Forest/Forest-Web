import { createApi } from "@reduxjs/toolkit/query/react";
import { base_url } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";

export const statistikApi = createApi({
  reducerPath: "statistikApi",
  baseQuery: createBaseQueryWithReauth(`${base_url}/statistics`),
  tagTypes: ["Reports"],
  endpoints: (builder) => ({
    getEmployeeIncomeStat: builder.query<any, any>({
      query: ({deadline, lang}) => `/finance-income-stat/?deadline=${deadline}&lang=${lang}`,
    }),
    getEmployeeReportStat: builder.query<any, any>({
      query: ({deadline, lang}) => `/employee-report-stat/?deadline=${deadline}&lang=${lang}`,
    }),
    getEmployeeFundStat: builder.query<any, any>({
      query: ({deadline, lang}) => `/finance-fund-stat/?deadline=${deadline}&lang=${lang}`,
    }),
    getEmployeeAnalysisStat: builder.query<any, any>({
      query: ({deadline, lang}) => `/employee-analysis-stat/?deadline=${deadline}&lang=${lang}`,
    }),
    getLandForest: builder.query<any, any>({
      query: ({lang,deadline}) => `/land-forest-stat/?lang=${lang}&deadline=${deadline}`,
    }),
    getLandAcquisition: builder.query<any, any>({
      query: ({lang,deadline}) => `/land-acquisition-stat/?lang=${lang}&deadline=${deadline}`,
    }),
    getLandRented: builder.query<any, any>({
      query: ({lang,deadline}) => `/land-rented-stat/?lang=${lang}&deadline=${deadline}`,
    }),
    getBuildForestGolofitStat: builder.query<any, any>({
      query: ({lang,deadline}) => `/build-forest-golofit/?lang=${lang}&deadline=${deadline}`,
    }),
    getBuildForestTeressaStat: builder.query<any, any>({
      query: ({lang,deadline}) => `/build-forest-teressa/?lang=${lang}&deadline=${deadline}`,
    }),
    getMonitorForestUzlashtirish: builder.query<any, any>({
      query: ({lang,deadline}) => `/monitor-forest-uzlashtirish/?lang=${lang}&deadline=${deadline}`,
    }),
    getProtectForestZararkunanda: builder.query<any, any>({
      query: ({lang,deadline}) => `/protect-forest-zararkunanda/?lang=${lang}&deadline=${deadline}`,
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
