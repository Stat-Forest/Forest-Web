import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { base_url, prepareHeaders } from "./baseUrl";

export const reportApi = createApi({
  reducerPath: "reportApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${base_url}/reports`,
    prepareHeaders,
  }),
  tagTypes: ["Reports"],
  endpoints: (builder) => ({
    // ==== ✅ GET endpoints ====
    getAllReports: builder.query<any, { status?: string }>({
      query: ({ status = "" }) => `/?status=${status}`,
    }),
    getReportById: builder.query({
      query: (id: string | number) => ({ url: `/${id}/`, method: "GET" }),
      providesTags: ["Reports"],
    }),
    getDashboardReport: builder.query<any, void>({
      query: () => ({ url: `/dashboard/`, method: "GET" }),
      providesTags: ["Reports"],
    }),
    getDeadlinesReport: builder.query<any, void>({
      query: () => ({ url: `/deadlines/`, method: "GET" }),
      providesTags: ["Reports"],
    }),
    getReportItemsReport: builder.query<any, void>({
      query: () => ({ url: `/report-items/`, method: "GET" }),
      providesTags: ["Reports"],
    }),
    getStatementColumnsReport: builder.query<any, string>({
      query: (statementId) => ({
        url: `/statement-columns/?statement=${statementId}`,
        method: "GET",
      }),
      providesTags: ["Reports"],
    }),

    getStatementsReport: builder.query<any, void>({
      query: () => ({ url: `/statements/`, method: "GET" }),
    }),
    getUsersReport: builder.query<any, void>({
      query: () => ({ url: `/users/`, method: "GET" }),
    }),
    getPlanColumnsReport: builder.query<any, void>({
      query: () => ({ url: `/plan-columns/`, method: "GET" }),
    }),
    getPlanListReport: builder.query<
      any,
      { columnId: string; organization: string; statement: string }
    >({
      query: ({ columnId, organization, statement }) => ({
        url: `/plan-list/?column__id=${columnId}&organization=${organization}&statement=${statement}`,
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
    }),
    submitReportFeedback: builder.mutation({
      query: (data) => ({
        url: `/feedback/`,
        method: "POST",
        body: data,
      }),
    }),
    generatePdfReport: builder.mutation({
      query: (params) => ({
        url: `/generate-pdf/`,
        method: "POST",
        body: params,
      }),
    }),
    PlanCreate: builder.mutation({
      query: (payload) => ({
        url: `/plan-create/`,
        method: "POST",
        body: payload,
      }),
    }),

    // ==== 🟦 PUT endpoints ====
    updateReport: builder.mutation({
      query: ({ id, data }) => ({
        url: `/${id}/`,
        method: "PUT",
        body: data,
      }),
    }),
    updateReportStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/${id}/status/`,
        method: "PUT",
        body: { status },
      }),
    }),
    updateReportSummary: builder.mutation({
      query: ({ id, summary }) => ({
        url: `/${id}/summary/`,
        method: "PUT",
        body: { summary },
      }),
    }),
    updateReportOwner: builder.mutation({
      query: ({ id, ownerId }) => ({
        url: `/${id}/owner/`,
        method: "PUT",
        body: { owner_id: ownerId },
      }),
    }),

    // ==== 🟥 DELETE endpoint ====
    deleteReport: builder.mutation({
      query: (id: string | number) => ({
        url: `/${id}/`,
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  // GET
  useGetAllReportsQuery,
  useGetReportByIdQuery,
  useGetDashboardReportQuery,
  useGetDeadlinesReportQuery,
  useGetReportItemsReportQuery,
  useGetStatementColumnsReportQuery,
  useGetStatementsReportQuery,
  useGetUsersReportQuery,
  useGetPlanColumnsReportQuery,
  useGetPlanListReportQuery,

  // POST
  useCreateReportMutation,
  useSubmitReportFeedbackMutation,
  useGeneratePdfReportMutation,
  usePlanCreateMutation,

  // PUT
  useUpdateReportMutation,
  useUpdateReportStatusMutation,
  useUpdateReportSummaryMutation,
  useUpdateReportOwnerMutation,

  // DELETE
  useDeleteReportMutation,
} = reportApi;
