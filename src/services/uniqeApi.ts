import { createApi } from "@reduxjs/toolkit/query/react";
import { base_url } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";

export const uniqeApi = createApi({
  reducerPath: "uniqeApi",
  baseQuery: createBaseQueryWithReauth(`${base_url}`),
  tagTypes: ["Reports"],
  endpoints: (builder) => ({
    createAiChat: builder.mutation({
      query: (newReport) => ({
        url: `/ai/chat/`,
        method: "POST",
        body: newReport,
      }),
      invalidatesTags: ["Reports"],
    }),
      exportStats: builder.mutation({
      query: (type) => ({
        url: `/report_admin_stat/stats/export/`,
        method: "GET",
        params: { type }, // csv yoki excel
        responseHandler: async (response) => await response.blob(),
      }),
    }),
  }),
});

export const {
  useCreateAiChatMutation,useExportStatsMutation
} = uniqeApi;
