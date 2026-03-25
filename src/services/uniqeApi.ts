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
  }),
});

export const {
  useCreateAiChatMutation,
} = uniqeApi;
