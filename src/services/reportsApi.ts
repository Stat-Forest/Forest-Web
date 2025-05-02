import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { base_url, prepareHeaders } from "./baseUrl";

export const reportApi = createApi({
  reducerPath: "reportApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${base_url}/reports`,
    prepareHeaders,
  }),
  endpoints: (builder) => ({
    // ==== ✅ GET endpoints ====
    getAllReports: builder.query<any, { status?: string }>({
      query: ({ status = "" }) => `/?status=${status}`,
    }),
    getReportById: builder.query({
      query: (id: string | number) => ({ url: `/${id}/`, method: "GET" }),
    }),
    getDashboardReport: builder.query<any, void>({
      query: () => ({ url: `/dashboard/`, method: "GET" }),
    }),
    getDeadlinesReport: builder.query({
      query: () => ({ url: `/deadlines/`, method: "GET" }),
    }),
    getReportItemsReport: builder.query({
      query: () => ({ url: `/report-items/`, method: "GET" }),
    }),
    getStatementColumnsReport: builder.query({
      query: () => ({ url: `/statement-columns/`, method: "GET" }),
    }),
    getStatementsReport: builder.query<any, void>({
      query: () => ({ url: `/statements/`, method: "GET" }),
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
    sendReportEmail: builder.mutation({
      query: (payload) => ({
        url: `/email/`,
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

  // POST
  useCreateReportMutation,
  useSubmitReportFeedbackMutation,
  useGeneratePdfReportMutation,
  useSendReportEmailMutation,

  // PUT
  useUpdateReportMutation,
  useUpdateReportStatusMutation,
  useUpdateReportSummaryMutation,
  useUpdateReportOwnerMutation,

  // DELETE
  useDeleteReportMutation,
} = reportApi;
