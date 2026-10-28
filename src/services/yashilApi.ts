import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { base_url, prepareHeaders } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";
import { getCabinetId } from "@/features/yashil/cabinet";
import { CABINET_HEADER } from "@/features/yashil/constants";
import type {
  CalendarDay,
  CatalogItem,
  DueDates,
  Mahalla,
  ObjectType,
  Paginated,
  Season,
  SuppliersForMahalla,
  UUID,
  YashilDistrict,
  YashilMe,
  YashilRegion,
} from "@/features/yashil/types";

const ME = "YashilMe";
const REF = "YashilRef";

type QueryValue = string | number | boolean | null | undefined;

const qs = (params?: Record<string, QueryValue>): string => {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || v === false) return;
    sp.set(k, v === true ? "1" : String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};

/** Reauth base query + faol kabinet header'i. */
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = (() => {
  const inner = createBaseQueryWithReauth(`${base_url}/yashil`);
  // fetchBaseQuery'ning prepareHeaders'ini kengaytirish o'rniga argumentga header qo'shamiz:
  // reauth qayta urinishda ham header saqlanadi.
  return (args, api, extra) => {
    const cabinet = getCabinetId();
    if (!cabinet) return inner(args, api, extra);
    const req: FetchArgs = typeof args === "string" ? { url: args } : { ...args };
    req.headers = { ...(req.headers as Record<string, string> | undefined), [CABINET_HEADER]: cabinet };
    return inner(req, api, extra);
  };
})();

void fetchBaseQuery;
void prepareHeaders;

export const yashilApi = createApi({
  reducerPath: "yashilApi",
  baseQuery,
  tagTypes: [ME, REF],
  endpoints: (builder) => ({
    getYashilMe: builder.query<YashilMe, void>({
      query: () => "/me/",
      providesTags: [ME],
    }),
    getYashilRegions: builder.query<YashilRegion[], void>({
      query: () => "/reference/regions/",
      providesTags: [{ type: REF, id: "regions" }],
    }),
    getYashilDistricts: builder.query<YashilDistrict[], { region?: UUID } | void>({
      query: (params) => `/reference/districts/${qs(params ?? undefined)}`,
      providesTags: [{ type: REF, id: "districts" }],
    }),
    getYashilMahallas: builder.query<Paginated<Mahalla>, { district?: UUID; region?: UUID; q?: string; page?: number; per_page?: number } | void>({
      query: (params) => `/reference/mahallas/${qs(params ?? undefined)}`,
      providesTags: [{ type: REF, id: "mahallas" }],
    }),
    getYashilSeasons: builder.query<Season[], void>({
      query: () => "/reference/seasons/",
      providesTags: [{ type: REF, id: "seasons" }],
    }),
    getYashilObjectTypes: builder.query<ObjectType[], void>({
      query: () => "/reference/object-types/",
      providesTags: [{ type: REF, id: "object-types" }],
    }),
    getSuppliersForMahalla: builder.query<SuppliersForMahalla, UUID>({
      query: (mahallaId) => `/suppliers/for-mahalla/${mahallaId}/`,
      providesTags: (_r, _e, id) => [{ type: REF, id: `suppliers-${id}` }],
    }),
    getYashilCatalog: builder.query<CatalogItem[], { supplier?: UUID; supplier_type?: string } | void>({
      query: (params) => `/catalog/${qs(params ?? undefined)}`,
      providesTags: [{ type: REF, id: "catalog" }],
    }),
    getYashilCalendar: builder.query<CalendarDay[], { year?: number } | void>({
      query: (params) => `/calendar/${qs(params ?? undefined)}`,
      providesTags: [{ type: REF, id: "calendar" }],
    }),
    getYashilDue: builder.query<DueDates, { start?: string } | void>({
      query: (params) => `/calendar/due/${qs(params ?? undefined)}`,
    }),
  }),
});

export const {
  useGetYashilMeQuery,
  useGetYashilRegionsQuery,
  useGetYashilDistrictsQuery,
  useGetYashilMahallasQuery,
  useGetYashilSeasonsQuery,
  useGetYashilObjectTypesQuery,
  useGetSuppliersForMahallaQuery,
  useGetYashilCatalogQuery,
  useGetYashilCalendarQuery,
  useGetYashilDueQuery,
} = yashilApi;
