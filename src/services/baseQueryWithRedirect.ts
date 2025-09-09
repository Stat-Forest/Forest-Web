import {
  BaseQueryFn,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { logout } from "@/features/authSlice";
import { base_url, prepareHeaders } from "./baseUrl";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: base_url,
  prepareHeaders,
});

export const baseQueryWithRedirect: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    api.dispatch(logout());
    window.location.href = "/auth";
  }

  return result;
};
