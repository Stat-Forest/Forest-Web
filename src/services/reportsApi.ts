import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { base_url, prepareHeaders } from "./baseUrl";
import { decryptData } from "@/utils/crypto";

export const reportApi = createApi({
  reducerPath: "reportApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${base_url}/reports`,
    prepareHeaders,
  }),
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
      }
    >({
      query: ({
        statement,
        status,
        organization__region,
        statement__period,
        search,
      }) =>
        `/?statement=${statement}&${status}&organization__region=${organization__region}&statement__period=${statement__period}&search=${search}`,
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
    getUsersReport: builder.query<any, { user_id?: string; page: any }>({
      query: ({ user_id = "", page }) => ({
        url: `/users/?id=${user_id}&page=${page}`,
        method: "GET",
      }),
    }),
    getPlanColumnsReport: builder.query<any, { search: string }>({
      query: ({ search }) => ({
        url: `/plan-columns/?statement=${search}`,
        method: "GET",
      }),
    }),
    getPlantsReport: builder.query<any, void>({
      query: () => ({ url: `/plants/`, method: "GET" }),
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
      }
    >({
      query: ({ columnId, organization, statement, page, search, year }) => ({
        url: `/plan-list/?column__id=${columnId}&organization=${organization}&statement=${statement}&page=${page}&search=${search}&year=${year}`,
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
    sendReport: builder.mutation({
      query: ({ id }) => ({
        url: `/send/`,
        method: "POST",
        body: { id },
      }),
    }),
    acceptReport: builder.mutation({
      query: ({ id }) => ({
        url: `/accept/`,
        method: "POST",
        body: { id },
      }),
    }),
    cancelReport: builder.mutation({
      query: ({ id, cancel_reason }) => ({
        url: `/cancel/`,
        method: "POST",
        body: { id, cancel_reason },
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
        url: `/${id}/delete/`,
        method: "DELETE",
      }),
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
    }
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
  useGetReportItemsReportQuery,
  useGetStatementColumnsReportQuery,
  useGetStatementsReportQuery,
  useGetUsersReportQuery,
  useGetPlanColumnsReportQuery,
  useGetPlanListReportQuery,
  useGetPlantsReportQuery,

  // POST
  useCreateReportMutation,
  useSubmitReportFeedbackMutation,
  useGeneratePdfReportMutation,
  usePlanCreateMutation,
  useSendReportMutation,
  useCancelReportMutation,
  useAcceptReportMutation,

  // PUT
  useUpdateReportMutation,
  useUpdateReportStatusMutation,
  useUpdateReportSummaryMutation,
  useUpdateReportOwnerMutation,

  // DELETE
  useDeleteReportMutation,
  useDeletePlanMutation,
} = reportApi;
