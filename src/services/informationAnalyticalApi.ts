import { createApi } from "@reduxjs/toolkit/query/react";
import { base_url } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";

export const informationAnalyticalApi = createApi({
  reducerPath: "informationAnalyticalApi",
  baseQuery: createBaseQueryWithReauth(`${base_url}/`),
  tagTypes: ["InformationAnalytical"],
  endpoints: (builder) => ({
   getInformationAnalytical: builder.query<any, { lang: string; region: string; organization: string; period: string }>({
      query: ({ lang,region, organization, period }) => `/information-analytical/?region=${region}&lang=${lang}&organization=${organization}&period=${period}`,
      providesTags: ["InformationAnalytical"],
    }),
  }),
});

export const { useGetInformationAnalyticalQuery } = informationAnalyticalApi;
