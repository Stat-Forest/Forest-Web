import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { base_url, prepareHeaders } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";
import { getCabinetId } from "@/features/yashil/cabinet";
import { CABINET_HEADER, IDEMPOTENCY_HEADER } from "@/features/yashil/constants";
import type {
  ActDetail,
  ActListItem,
  ActAttachmentOut,
  ActReturnReason,
  ActSignTask,
  ActWrite,
  CalendarDay,
  CancelRequestOut,
  CancelWrite,
  CapacityRow,
  CatalogItem,
  DocumentVersionFull,
  PdfInfo,
  StockEntryIn,
  StockEntryResult,
  StockMovementOut,
  StockSummary,
  SupplierOrgRow,
  DueDates,
  ExportFormat,
  ExportJobOut,
  ExportKind,
  MapPoints,
  OrgLagRow,
  RegistryPage,
  RegistrySummary,
  ReportDictionaries,
  ReportFilterParams,
  SeedlingStats,
  StatsCards,
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
const STOCK = "YashilStock";
const ACTS = "YashilActs";
const CANCEL = "YashilCancel";
const REPORTS = "YashilReports";
const STATS = "YashilStats";
const MAP = "YashilMap";
const EXPORTS = "YashilExports";

/** Har o'zgartiruvchi so'rov uchun yangi Idempotency-Key (takror bosishdan himoya backend'da). */
export const newIdempotencyKey = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const idem = (key?: string) => ({ [IDEMPOTENCY_HEADER]: key || newIdempotencyKey() });

export interface OrderListParams extends ReportFilterParams {
  state?: string;
  route?: "forest" | "dm" | "";
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
  tagTypes: [ME, REF, ORDERS, NOTIF, STOCK, ACTS, CANCEL, REPORTS, STATS, MAP, EXPORTS],
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
      invalidatesTags: (_r, _e, { id }) => [{ type: ORDERS, id }, { type: ORDERS, id: "LIST" }, ME, REPORTS, STATS, MAP],
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
      invalidatesTags: (_r, _e, { id }) => [{ type: ORDERS, id }, { type: ORDERS, id: "LIST" }, STOCK, REPORTS, STATS, MAP],
    }),

    // ===================================================================== ombor (3-bosqich)
    getYashilStock: builder.query<StockSummary, { organization?: UUID } | void>({
      query: (params) => `/stock/${qs(params ?? undefined)}`,
      providesTags: [STOCK],
    }),
    getYashilStockOrganizations: builder.query<{ results: SupplierOrgRow[] }, { q?: string } | void>({
      query: (params) => `/stock/organizations/${qs(params ?? undefined)}`,
      providesTags: [STOCK],
    }),
    getYashilStockMovements: builder.query<Paginated<StockMovementOut>, { organization?: UUID; item?: UUID; kind?: string; status?: string; page?: number; per_page?: number } | void>({
      query: (params) => `/stock/movements/${qs((params ?? undefined) as Record<string, QueryValue> | undefined)}`,
      providesTags: [STOCK],
    }),
    getYashilCapacity: builder.query<{ period: string; rows: CapacityRow[] }, { period: string; organization?: UUID }>({
      query: (params) => `/stock/capacity/${qs(params as unknown as Record<string, QueryValue>)}`,
      providesTags: [STOCK],
    }),
    postYashilStockEntry: builder.mutation<StockEntryResult, { kind: "receipts" | "opening" | "returns"; body: StockEntryIn; key?: string }>({
      query: ({ kind, body, key }) => {
        const form = new FormData();
        form.append("catalog_item", body.catalog_item);
        form.append("qty", body.qty);
        form.append("doc_number", body.doc_number);
        form.append("doc_date", body.doc_date);
        if (body.note) form.append("note", body.note);
        if (body.file) form.append("file", body.file);
        return { url: `/stock/${kind}/`, method: "POST", body: form, headers: idem(key) };
      },
      invalidatesTags: [STOCK],
    }),
    requestYashilReversal: builder.mutation<StockEntryResult, { movement: UUID; note: string }>({
      query: (body) => ({ url: "/stock/reversals/", method: "POST", body, headers: idem() }),
      invalidatesTags: [STOCK],
    }),
    decideYashilReversal: builder.mutation<StockEntryResult, { id: UUID; decision: "approve" | "reject"; note?: string }>({
      query: ({ id, decision, note }) => ({ url: `/stock/reversals/${id}/${decision}/`, method: "POST", body: { note: note ?? "" }, headers: idem() }),
      invalidatesTags: [STOCK],
    }),

    // ===================================================================== dalolatnomalar (3-bosqich)
    getYashilActs: builder.query<Paginated<ActListItem>, ({ order?: UUID; status?: string; q?: string; page?: number; per_page?: number } & ReportFilterParams) | void>({
      query: (params) => `/acts/${qs((params ?? undefined) as Record<string, QueryValue> | undefined)}`,
      providesTags: (res) => [{ type: ACTS, id: "LIST" } as const, ...(res?.results ?? []).map((a) => ({ type: ACTS, id: a.id }) as const)],
    }),
    getYashilAct: builder.query<ActDetail, UUID>({
      query: (id) => `/acts/${id}/`,
      providesTags: (_r, _e, id) => [{ type: ACTS, id }],
    }),
    createYashilAct: builder.mutation<ActDetail, { orderId: UUID; body: ActWrite; key?: string }>({
      query: ({ orderId, body, key }) => ({ url: `/orders/${orderId}/acts/`, method: "POST", body, headers: idem(key) }),
      invalidatesTags: (_r, _e, { orderId }) => [{ type: ACTS, id: "LIST" }, { type: ORDERS, id: orderId }, { type: ORDERS, id: "LIST" }],
    }),
    updateYashilAct: builder.mutation<ActDetail, { id: UUID; body: ActWrite }>({
      query: ({ id, body }) => ({ url: `/acts/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: ACTS, id }, { type: ACTS, id: "LIST" }],
    }),
    uploadYashilActAttachment: builder.mutation<ActAttachmentOut, { id: UUID; file: File; kind?: string }>({
      query: ({ id, file, kind }) => {
        const form = new FormData();
        form.append("file", file);
        if (kind) form.append("kind", kind);
        return { url: `/acts/${id}/attachments/`, method: "POST", body: form };
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: ACTS, id }],
    }),
    deleteYashilActAttachment: builder.mutation<void, { id: UUID; attachmentId: UUID }>({
      query: ({ id, attachmentId }) => ({ url: `/acts/${id}/attachments/${attachmentId}/`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { id }) => [{ type: ACTS, id }],
    }),
    prepareYashilActSign: builder.mutation<ActSignTask, UUID>({
      query: (id) => ({ url: `/acts/${id}/sign-task/`, method: "POST", body: {} }),
    }),
    signYashilAct: builder.mutation<ActDetail, { id: UUID; document_version_id: UUID; nonce: string; pkcs7: string; key?: string }>({
      query: ({ id, key, ...body }) => ({ url: `/acts/${id}/sign/`, method: "POST", body, headers: idem(key) }),
      invalidatesTags: (res, _e, { id }) => [{ type: ACTS, id }, { type: ACTS, id: "LIST" }, { type: ORDERS, id: res?.order.id ?? "LIST" }, { type: ORDERS, id: "LIST" }, ME, REPORTS, STATS, MAP],
    }),
    returnYashilAct: builder.mutation<ActDetail, { id: UUID; reason_code: ActReturnReason; comment: string }>({
      query: ({ id, ...body }) => ({ url: `/acts/${id}/return/`, method: "POST", body, headers: idem() }),
      invalidatesTags: (res, _e, { id }) => [{ type: ACTS, id }, { type: ACTS, id: "LIST" }, { type: ORDERS, id: res?.order.id ?? "LIST" }],
    }),
    cancelYashilAct: builder.mutation<ActDetail, { id: UUID; comment?: string }>({
      query: ({ id, comment }) => ({ url: `/acts/${id}/cancel/`, method: "POST", body: { comment: comment ?? "" }, headers: idem() }),
      invalidatesTags: (res, _e, { id }) => [{ type: ACTS, id }, { type: ACTS, id: "LIST" }, { type: ORDERS, id: res?.order.id ?? "LIST" }],
    }),

    // ===================================================================== bekor qilish (3-bosqich)
    cancelYashilOrder: builder.mutation<OrderDetail | CancelRequestOut, { id: UUID; body: CancelWrite; key?: string }>({
      query: ({ id, body, key }) => ({ url: `/orders/${id}/cancel/`, method: "POST", body, headers: idem(key) }),
      invalidatesTags: (_r, _e, { id }) => [{ type: ORDERS, id }, { type: ORDERS, id: "LIST" }, { type: CANCEL, id: "LIST" }],
    }),
    getYashilCancelRequests: builder.query<Paginated<CancelRequestOut>, { order?: UUID; status?: string; page?: number; per_page?: number } | void>({
      query: (params) => `/cancel/${qs((params ?? undefined) as Record<string, QueryValue> | undefined)}`,
      providesTags: [{ type: CANCEL, id: "LIST" }],
    }),
    decideYashilCancel: builder.mutation<CancelRequestOut, { id: UUID; decision: "agree" | "approve" | "reject"; note?: string }>({
      query: ({ id, decision, note }) => ({ url: `/cancel/${id}/${decision}/`, method: "POST", body: { note: note ?? "" }, headers: idem() }),
      invalidatesTags: (res) => [{ type: CANCEL, id: "LIST" }, { type: ORDERS, id: res?.order.id ?? "LIST" }, { type: ORDERS, id: "LIST" }, STOCK],
    }),
    // ===================================================================== hisobot, statistika, xarita (4-bosqich)
    getYashilRegistry: builder.query<RegistryPage, ReportFilterParams | void>({
      query: (params) => `/reports/registry/${qs((params ?? undefined) as Record<string, QueryValue> | undefined)}`,
      providesTags: [REPORTS],
    }),
    getYashilRegistrySummary: builder.query<RegistrySummary, ReportFilterParams | void>({
      query: (params) => `/reports/registry/summary/${qs((params ?? undefined) as Record<string, QueryValue> | undefined)}`,
      providesTags: [REPORTS],
    }),
    getYashilReportFilters: builder.query<ReportDictionaries, void>({
      query: () => "/reports/filters/",
      providesTags: [REPORTS, REF],
    }),
    createYashilExport: builder.mutation<ExportJobOut, { kind: ExportKind; format: ExportFormat; filters: Record<string, unknown> }>({
      query: (body) => ({ url: "/reports/exports/", method: "POST", body }),
      invalidatesTags: [EXPORTS],
    }),
    getYashilExports: builder.query<{ results: ExportJobOut[] }, void>({
      query: () => "/reports/exports/",
      providesTags: [EXPORTS],
    }),
    getYashilExport: builder.query<ExportJobOut, UUID>({
      query: (id) => `/reports/exports/${id}/`,
    }),
    getYashilStatsCards: builder.query<StatsCards, ReportFilterParams | void>({
      query: (params) => `/stats/cards/${qs((params ?? undefined) as Record<string, QueryValue> | undefined)}`,
      providesTags: [STATS],
    }),
    getYashilStatsSeedlings: builder.query<SeedlingStats, ReportFilterParams | void>({
      query: (params) => `/stats/seedlings/${qs((params ?? undefined) as Record<string, QueryValue> | undefined)}`,
      providesTags: [STATS],
    }),
    getYashilStatsOrganizations: builder.query<{ results: OrgLagRow[]; filters_label: string }, ReportFilterParams | void>({
      query: (params) => `/stats/organizations/${qs((params ?? undefined) as Record<string, QueryValue> | undefined)}`,
      providesTags: [STATS],
    }),
    getYashilMapPoints: builder.query<MapPoints, (ReportFilterParams & { bbox?: string }) | void>({
      query: (params) => `/map/points/${qs((params ?? undefined) as Record<string, QueryValue> | undefined)}`,
      providesTags: [MAP],
    }),
    getYashilDocumentPdf: builder.query<PdfInfo, UUID>({
      query: (id) => `/documents/${id}/pdf/`,
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

/** PDF havolasini olib (himoyalangan media, imzoli `?t=`), yangi oynada ochadi. */
export const openDocumentPdf = async (versionId: UUID, token: string | null): Promise<void> => {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const cabinet = getCabinetId();
  if (cabinet) headers[CABINET_HEADER] = cabinet;
  const res = await fetch(`${base_url}/yashil/documents/${versionId}/pdf/`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const info = (await res.json()) as PdfInfo;
  window.open(info.url.startsWith("http") ? info.url : `${window.location.origin}${info.url}`, "_blank", "noopener");
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
  useGetYashilStockQuery,
  useGetYashilStockOrganizationsQuery,
  useGetYashilStockMovementsQuery,
  useGetYashilCapacityQuery,
  usePostYashilStockEntryMutation,
  useRequestYashilReversalMutation,
  useDecideYashilReversalMutation,
  useGetYashilActsQuery,
  useGetYashilActQuery,
  useCreateYashilActMutation,
  useUpdateYashilActMutation,
  useUploadYashilActAttachmentMutation,
  useDeleteYashilActAttachmentMutation,
  usePrepareYashilActSignMutation,
  useSignYashilActMutation,
  useReturnYashilActMutation,
  useCancelYashilActMutation,
  useCancelYashilOrderMutation,
  useGetYashilCancelRequestsQuery,
  useDecideYashilCancelMutation,
  useGetYashilDocumentPdfQuery,
  useGetYashilRegistryQuery,
  useGetYashilRegistrySummaryQuery,
  useGetYashilReportFiltersQuery,
  useCreateYashilExportMutation,
  useGetYashilExportsQuery,
  useLazyGetYashilExportQuery,
  useGetYashilStatsCardsQuery,
  useGetYashilStatsSeedlingsQuery,
  useGetYashilStatsOrganizationsQuery,
  useGetYashilMapPointsQuery,
} = yashilApi;
