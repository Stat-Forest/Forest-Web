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
  }),
});

export const { useGetIncomeSumQuery } = sumApi;
