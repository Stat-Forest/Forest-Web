import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { base_url, prepareHeaders } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";
import { getCabinetId } from "@/features/yashil/cabinet";
import { CABINET_HEADER, IDEMPOTENCY_HEADER } from "@/features/yashil/constants";
import type {
  CalendarDay,
  CatalogItem,
  DocumentVersionFull,
  DueDates,
  Mahalla,
  ObjectType,
  OrderAttachmentOut,
  OrderDetail,
  OrderEventOut,
  OrderListItem,
  OrderWrite,
  Paginated,
  PublicVerify,
  ReturnReason,
  Season,
  SigningTask,
  SuppliersForMahalla,
  UUID,
  YashilDistrict,
  YashilMe,
  YashilNotificationOut,
  YashilRegion,
} from "@/features/yashil/types";

const ME = "YashilMe";
const REF = "YashilRef";
const ORDERS = "YashilOrders";
const NOTIF = "YashilNotif";

/** Har o'zgartiruvchi so'rov uchun yangi Idempotency-Key (takror bosishdan himoya backend'da). */
export const newIdempotencyKey = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const idem = (key?: string) => ({ [IDEMPOTENCY_HEADER]: key || newIdempotencyKey() });

export interface OrderListParams {
  state?: string;
  route?: string;
  mahalla?: UUID;
  q?: string;
  page?: number;
  per_page?: number;
}

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

void prepareHeaders;

/** Ochiq (login'siz) QR tekshiruvi — Authorization yuborilmaydi, 401'da logout bo'lmaydi. */
const publicBaseQuery = fetchBaseQuery({ baseUrl: `${base_url}/yashil` });

export const yashilApi = createApi({
  reducerPath: "yashilApi",
  baseQuery,
  tagTypes: [ME, REF, ORDERS, NOTIF],
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

    // ===================================================================== buyurtmalar
    getYashilOrders: builder.query<Paginated<OrderListItem>, OrderListParams | void>({
      query: (params) => `/orders/${qs((params ?? undefined) as Record<string, QueryValue> | undefined)}`,
      providesTags: (res) => [
        { type: ORDERS, id: "LIST" } as const,
        ...(res?.results ?? []).map((o) => ({ type: ORDERS, id: o.id }) as const),
      ],
    }),
    getYashilOrder: builder.query<OrderDetail, UUID>({
      query: (id) => `/orders/${id}/`,
      providesTags: (_r, _e, id) => [{ type: ORDERS, id }],
    }),
    createYashilOrder: builder.mutation<OrderDetail, OrderWrite>({
      query: (body) => ({ url: "/orders/", method: "POST", body }),
      invalidatesTags: [{ type: ORDERS, id: "LIST" }],
    }),
    updateYashilOrder: builder.mutation<OrderDetail, { id: UUID; body: Partial<OrderWrite> & { version_no: number } }>({
      query: ({ id, body }) => ({ url: `/orders/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: ORDERS, id }, { type: ORDERS, id: "LIST" }],
    }),
    uploadYashilAttachment: builder.mutation<OrderAttachmentOut, { id: UUID; file: File; kind?: string }>({
      query: ({ id, file, kind }) => {
        const form = new FormData();
        form.append("file", file);
        if (kind) form.append("kind", kind);
        return { url: `/orders/${id}/attachments/`, method: "POST", body: form };
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: ORDERS, id }],
    }),
    deleteYashilAttachment: builder.mutation<void, { id: UUID; attachmentId: UUID }>({
      query: ({ id, attachmentId }) => ({ url: `/orders/${id}/attachments/${attachmentId}/`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { id }) => [{ type: ORDERS, id }],
    }),
    prepareYashilDocument: builder.mutation<SigningTask, { id: UUID; version_no: number }>({
      query: ({ id, version_no }) => ({ url: `/orders/${id}/document/`, method: "POST", body: { version_no } }),
    }),
    submitYashilOrder: builder.mutation<OrderDetail, { id: UUID; document_version_id: UUID; nonce: string; pkcs7: string; version_no: number; key?: string }>({
      query: ({ id, key, ...body }) => ({ url: `/orders/${id}/submit/`, method: "POST", body, headers: idem(key) }),
      invalidatesTags: (_r, _e, { id }) => [{ type: ORDERS, id }, { type: ORDERS, id: "LIST" }, ME],
    }),
    reviewYashilOrder: builder.mutation<OrderDetail, { id: UUID; version_no: number }>({
      query: ({ id, version_no }) => ({ url: `/orders/${id}/review/`, method: "POST", body: { version_no }, headers: idem() }),
      invalidatesTags: (_r, _e, { id }) => [{ type: ORDERS, id }, { type: ORDERS, id: "LIST" }],
    }),
    forwardYashilOrder: builder.mutation<OrderDetail, { id: UUID; version_no: number }>({
      query: ({ id, version_no }) => ({ url: `/orders/${id}/forward/`, method: "POST", body: { version_no }, headers: idem() }),
      invalidatesTags: (_r, _e, { id }) => [{ type: ORDERS, id }, { type: ORDERS, id: "LIST" }],
    }),
    returnYashilOrder: builder.mutation<OrderDetail, { id: UUID; version_no: number; reason_code: ReturnReason; comment: string; fields?: string[] }>({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/return/`, method: "POST", body, headers: idem() }),
      invalidatesTags: (_r, _e, { id }) => [{ type: ORDERS, id }, { type: ORDERS, id: "LIST" }],
    }),
    acceptYashilOrder: builder.mutation<OrderDetail, { id: UUID; version_no: number; executor_name: string }>({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/accept/`, method: "POST", body, headers: idem() }),
      invalidatesTags: (_r, _e, { id }) => [{ type: ORDERS, id }, { type: ORDERS, id: "LIST" }],
    }),
    getYashilOrderEvents: builder.query<OrderEventOut[], UUID>({
      query: (id) => `/orders/${id}/events/`,
      providesTags: (_r, _e, id) => [{ type: ORDERS, id }],
    }),
    getYashilDocumentVersion: builder.query<DocumentVersionFull, UUID>({
      query: (id) => `/documents/${id}/`,
    }),
    getYashilNotifications: builder.query<Paginated<YashilNotificationOut>, { unread?: boolean; page?: number; per_page?: number } | void>({
      query: (params) => `/notifications/${qs((params ?? undefined) as Record<string, QueryValue> | undefined)}`,
      providesTags: [NOTIF],
    }),
    readYashilNotification: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({ url: `/notifications/${id}/read/`, method: "POST" }),
      invalidatesTags: [NOTIF, ME],
    }),
    readAllYashilNotifications: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: "/notifications/read-all/", method: "POST" }),
      invalidatesTags: [NOTIF, ME],
    }),
    verifyYashilDocument: builder.query<PublicVerify, string>({
      queryFn: async (token) => {
        const res = await publicBaseQuery(`/verify/${encodeURIComponent(token)}/`, { signal: new AbortController().signal } as never, {});
        if (res.error) return { error: res.error as FetchBaseQueryError };
        return { data: res.data as PublicVerify };
      },
    }),
  }),
});

/** Hujjatning bosma HTML'ini (Authorization bilan) olib, yangi oynada ochadi. */
export const openDocumentHtml = async (versionId: UUID, token: string | null): Promise<void> => {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const cabinet = getCabinetId();
  if (cabinet) headers[CABINET_HEADER] = cabinet;
  const res = await fetch(`${base_url}/yashil/documents/${versionId}/html/`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

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
  useGetYashilOrdersQuery,
  useGetYashilOrderQuery,
  useCreateYashilOrderMutation,
  useUpdateYashilOrderMutation,
  useUploadYashilAttachmentMutation,
  useDeleteYashilAttachmentMutation,
  usePrepareYashilDocumentMutation,
  useSubmitYashilOrderMutation,
  useReviewYashilOrderMutation,
  useForwardYashilOrderMutation,
  useReturnYashilOrderMutation,
  useAcceptYashilOrderMutation,
  useGetYashilOrderEventsQuery,
  useGetYashilDocumentVersionQuery,
  useGetYashilNotificationsQuery,
  useReadYashilNotificationMutation,
  useReadAllYashilNotificationsMutation,
  useVerifyYashilDocumentQuery,
} = yashilApi;
