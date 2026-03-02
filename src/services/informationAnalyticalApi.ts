import { createApi } from "@reduxjs/toolkit/query/react";
import { base_url } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";

export const informationAnalyticalApi = createApi({
  reducerPath: "informationAnalyticalApi",
  baseQuery: createBaseQueryWithReauth(`${base_url}/information-analytical`),
  tagTypes: ["InformationAnalytical"],
  endpoints: (builder) => ({
    getInformationAnalytical: builder.query<
      { results?: any[]; [key: string]: any },
      void | { statement?: string }
    >({
      query: (params) => {
        const statement = params && typeof params === "object" ? params.statement : undefined;
        const url = statement ? `/?statement=${statement}` : "/";
        return { url, method: "GET" };
      },
      providesTags: ["InformationAnalytical"],
    }),
  }),
});

export const { useGetInformationAnalyticalQuery } = informationAnalyticalApi;
