import { createApi } from "@reduxjs/toolkit/query/react";
import { base_url } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";
import { decryptData } from "@/utils/crypto";
import { DeadlineMonthResponse } from "@/types/reportInterface";

export const reportApi = createApi({
  reducerPath: "reportApi",
  baseQuery: createBaseQueryWithReauth(`${base_url}/reports`),
  tagTypes: ["Reports"],
  endpoints: (builder) => ({
    // ==== ✅ GET endpoints ====
    getAllReports: builder.query<
      any,
      {
        statement: string;
        status: string;
        organization__region: string;
        statement__period: string;
        search: string;
        time_status?: string;
        page?: number;
        per_page?: number;
      }
    >({
      query: ({
        statement,
        status,
        organization__region,
        statement__period,
        search,
        time_status,
        page,
        per_page,
      }) => {
        let url = `/?statement=${statement}&${status}&organization_region=${organization__region}&statement_period=${statement__period}&organization_name=${search}&page=${page}&per_page=${per_page}`;
        // Faqat late_reports va ontime_reports uchun time_status parametrini qo'shish
        if (time_status) {
          url += `&time_status=${time_status}`;
        }
        return url;
      },
      providesTags: ["Reports"],
    }),

    getReportById: builder.query<
      any,
      { id: string | number; is_user_input: any }
    >({
      query: ({ id, is_user_input }) => ({
        url: `/${id}/?is_user_input=${is_user_input}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),
    getDashboardReport: builder.query<any, void>({
      query: () => ({ url: `/dashboard/`, method: "GET" }),
      providesTags: ["Reports"],
    }),
    getStatementStatsReport: builder.query<any, void>({
      query: () => ({ url: `/dashboard/statement-stats/`, method: "GET" }),
      providesTags: ["Reports"],
    }),
getStatsExportReport: builder.mutation<Blob, "csv" | "excel">({
  query: (format) => ({
    url: `/dashboard/stats/export/?format=${format}`,
    method: "GET",
    responseHandler: (response) => response.blob(), // MUHIM
  }),
}),

    getDeadlinesReport: builder.query<
      any,
      {
        statement: string;
        page: number;
        perPage: number;
        statement__period: string;
        is_new_deadline?: string;
      }
    >({
      query: ({
        statement,
        page,
        perPage,
        statement__period,
        is_new_deadline,
      }) => {
        let url = `/deadlines/?statement=${statement}&page=${page}&per_page=${perPage}&statement__period=${statement__period}`;
        if (is_new_deadline) {
          url += `&is_new_deadline=${is_new_deadline}`;
        }
        return {
          url,
          method: "GET",
        };
      },
      providesTags: ["Reports"],
    }),
    getExpiredDeadlinesReport: builder.query<
      any,
      {
        deadline_at?: any;
        organizations?: any;
        page?: number;
        per_page?: number;
        statement?: any;
        submit_at?: string;
        period?: string;
      }
    >({
      query: (params = {}) => {
        return {
          url: `/expired-deadlines/?deadline_at=${params.deadline_at}&organizations=${params.organizations}&page=${params.page || 1}&per_page=${params.per_page || 10}&statement=${params.statement}&submit_at=${params.submit_at}&period=${params.period}`,
          method: "GET",
        };
      },
      providesTags: ["Reports"],
    }),
    getLoginStatDeadline: builder.query<DeadlineMonthResponse, any>({
      query: ({ page = 1, per_page = 2000, period_type }) => ({
        url: `/login-stat-deadlines/?page=${page}&per_page=${per_page}&period_type=${period_type}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),
    getReportItemsReport: builder.query<any, void>({
      query: () => ({ url: `/report-items/`, method: "GET" }),
      providesTags: ["Reports"],
    }),
    getStatementColumnsReport: builder.query<
      any,
      { statementId: any; lang: string; isUser: string }
    >({
      query: ({ statementId, lang, isUser }) => ({
        url: `/statement-columns/?statement=${statementId}&lang=${lang}&is_user_input=${isUser}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),

    getStatementsReport: builder.query<any, { lang: string }>({
      query: ({ lang }) => ({
        url: `/statements/?lang=${lang}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),
    getUsersReport: builder.query<
      any,
      {
        user_id?: string;
        page: any;
        perPage: number;
        search?: any;
        organization?: any;
        role?: string;
      }
    >({
      query: ({ user_id = "", page, perPage, search, organization, role }) => ({
        url: `/users/?id=${user_id}&page=${page}&per_page=${perPage}&first_name=${search}&organization=${organization}&role=${role}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),
    getPlanColumnsReport: builder.query<any, { search: string }>({
      query: ({ search }) => ({
        url: `/plan-columns/?statement=${search}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),
    getPlantsReport: builder.query<
      any,
      {
        statement?: string;
        lang: string;
        parent: string;
        page: number;
        perPage: number;
      }
    >({
      query: ({ statement, lang, parent, page, perPage }) => {
        const params = new URLSearchParams({
          lang,
          parent,
          page: String(page),
          per_page: String(perPage),
          statement: statement || "",
        });
        return {
          url: `/plants/?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["Reports"],
    }),
    getRepoblicReport: builder.query<any, void>({
      query: () => ({ url: `/republic/`, method: "GET" }),
      providesTags: ["Reports"],
    }),
    getReganalReport: builder.query<
      any,
      { statement: string; region: string; deadline: string }
    >({
      query: ({ statement, region = "", deadline }) => ({
        url: `/filtered-general/?statement=${statement}&region=${region}&deadline=${deadline}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),
    getPlanListReport: builder.query<
      any,
      {
        columnId: string;
        organization: string;
        statement: string;
        page: any;
        search: string;
        year: string;
        perPage: number;
        season: string;
      }
    >({
      query: ({
        columnId,
        organization,
        statement,
        page,
        search,
        year,
        perPage,
        season,
      }) => ({
        url: `/plan-list/?column__id=${columnId}&organization=${organization}&statement=${statement}&page=${page}&search=${search}&year=${year}&per_page=${perPage}&&season=${season}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),

    getPlanItemsReport: builder.query<
      any,
      {
        organization_id: string;
        statement_id: string;
        year: string;
        column: string;
        season?: string | null;
        plant_id?: string;
      }
    >({
      query: ({
        organization_id,
        statement_id,
        year,
        column,
        season,
        plant_id,
      }) => {
        let url = `/plan-items/?organization=${organization_id}&column=${column}&statement=${statement_id}&year=${year}`;
        if (season) {
          url += `&season=${season}`;
        }
        if (plant_id) {
          url += `&plant=${plant_id}`;
        }
        return {
          url,
          method: "GET",
        };
      },
      providesTags: ["Reports"],
    }),
    getPlanById: builder.query<any, string>({
      query: (id) => ({
        url: `/plan/${id}/`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),
    getIndividual: builder.query<
      any,
      { deadline: string; statement: string; organization: string }
    >({
      query: ({ deadline, statement, organization }) => ({
        url: `/individual/?deadline=${deadline}&statement=${statement}&organization=${organization}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),
    getReportPlant: builder.query<
      any,
      { lang: string; page: number; per_page: number; search: string }
    >({
      query: ({ lang, page, per_page, search }) => ({
        url: `/report-plant/?lang=${lang}&page=${page}&per_page=${per_page}&search=${search}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),
    getReportPlantById: builder.query<
      any,
      { id: string; is_user_input: string }
    >({
      query: ({ id, is_user_input }) => ({
        url: `/report-plant/${id}/?is_user_input=${is_user_input}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),
    getReportSourceReports: builder.query<any, { userById: any }>({
      query: ({ userById }) => ({
        url: `/source-reports/kochat-nihol/?organization=${userById}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),

    // ==== 🟩 POST endpoints ====
    createReport: builder.mutation({
      query: (newReport) => ({
        url: `/create/`,
        method: "POST",
        body: newReport,
      }),
      invalidatesTags: ["Reports"],
    }),
    sendReport: builder.mutation({
      query: ({ id }) => ({
        url: `/send/`,
        method: "POST",
        body: { id },
      }),
      invalidatesTags: ["Reports"],
    }),
    acceptReport: builder.mutation({
      query: ({ id }) => ({
        url: `/accept/`,
        method: "POST",
        body: { id },
      }),
      invalidatesTags: ["Reports"],
    }),
    cancelReport: builder.mutation({
      query: ({ id, cancel_reason }) => ({
        url: `/cancel/`,
        method: "POST",
        body: { id, cancel_reason },
      }),
      invalidatesTags: ["Reports"],
    }),
    exportExcel: builder.mutation<
      any,
      {
        report_ids: string[];
        lang: string;
        mode?: string;
        row_numbers?: Record<string, string>;
        aggregated?: boolean;
      }
    >({
      query: ({
        report_ids,
        lang,
        mode = "json",
        row_numbers = {},
        aggregated = true,
      }) => ({
        url: `/export-excel/`,
        method: "POST",
        body: { report_ids, lang, mode, row_numbers, aggregated },
      }),
    }),
    exportPdf: builder.mutation<
      any,
      {
        report_ids: string[];
        lang: string;
        mode?: string;
        row_numbers?: Record<string, string>;
        aggregated?: boolean;
      }
    >({
      query: ({
        report_ids,
        lang,
        mode = "json",
        row_numbers = {},
        aggregated = true,
      }) => ({
        url: `/export-pdf/`,
        method: "POST",
        body: { report_ids, lang, mode, row_numbers, aggregated },
      }),
    }),
    PlanCreate: builder.mutation({
      query: (payload) => ({
        url: `/plan-create/`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Reports"],
    }),
    plantCreate: builder.mutation({
      query: (payload) => ({
        url: `/plant/create/`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Reports"],
    }),

    // ==== 🟦 PUT endpoints ====
    updateReport: builder.mutation({
      query: ({ id, ...rest }) => ({
        url: `/${id}/update/`,
        method: "PUT",
        body: rest,
      }),
      invalidatesTags: ["Reports"],
    }),

    updateReportStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/${id}/status/`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: ["Reports"],
    }),
    updatePlan: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/plan/${id}/update/`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Reports"],
    }),
    updateReportPlant: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/report-plant/${id}/update`,
        method: "PUT",
        body: data, // { rest } emas, to'g'ridan-to'g'ri data
      }),
      invalidatesTags: ["Reports"],
    }),
    updateReportOwner: builder.mutation({
      query: ({ id, ownerId }) => ({
        url: `/${id}/owner/`,
        method: "PUT",
        body: { owner_id: ownerId },
      }),
      invalidatesTags: ["Reports"],
    }),

    // patch endpoints ====
    patchPlantReport: builder.mutation({
      query: ({ id, ...rest }) => ({
        url: `/report-plant/${id}/update/`,
        method: "PATCH",
        body: rest,
      }),
      invalidatesTags: ["Reports"],
    }),

    // ==== 🟥 DELETE endpoint ====
    deleteReport: builder.mutation({
      query: (id: string | number) => ({
        url: `/${id}/delete/`,
        method: "DELETE",
      }),
      invalidatesTags: ["Reports"],
    }),
    deletePlan: builder.mutation({
      query: (id: string | number) => ({
        url: `/plans/${id}/delete/`,
        method: "DELETE",
      }),
      invalidatesTags: ["Reports"],
    }),
  }),
});

export const fetchReportDeadlines = async (page: number, perPage: number) => {
  const token = decryptData("token", "token");

  if (!token) {
    throw new Error("No token found. Please log in.");
  }

  const res = await fetch(
    `${base_url}/reports/deadlines/?page=${page}&per_page=${perPage}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Error ${res.status}: ${errorBody}`);
  }

  const data = await res.json();
  return data;
};

export const {
  // GET
  useGetAllReportsQuery,
  useGetReportByIdQuery,
  useGetDashboardReportQuery,
  useGetDeadlinesReportQuery,
  useGetExpiredDeadlinesReportQuery,
  useGetReportItemsReportQuery,
  useGetStatementColumnsReportQuery,
  useGetStatementsReportQuery,
  useGetUsersReportQuery,
  useGetPlanColumnsReportQuery,
  useGetPlanListReportQuery,
  useGetPlantsReportQuery,
  useGetPlanItemsReportQuery,
  useGetPlanByIdQuery,
  useGetRepoblicReportQuery,
  useGetReganalReportQuery,
  useGetIndividualQuery,
  useLazyGetReganalReportQuery,
  useGetReportPlantQuery,
  useGetReportPlantByIdQuery,
  useGetLoginStatDeadlineQuery,
  useGetReportSourceReportsQuery,
  useGetStatementStatsReportQuery,
  useGetStatsExportReportMutation,

  // POST
  useCreateReportMutation,
  usePlanCreateMutation,
  useSendReportMutation,
  useCancelReportMutation,
  useAcceptReportMutation,
  usePlantCreateMutation,
  useExportExcelMutation,
  useExportPdfMutation,

  // PUT
  useUpdateReportMutation,
  useUpdateReportStatusMutation,
  useUpdateReportPlantMutation,
  useUpdateReportOwnerMutation,
  useUpdatePlanMutation,

  // PATCH
  usePatchPlantReportMutation,

  // DELETE
  useDeleteReportMutation,
  useDeletePlanMutation,
} = reportApi;
