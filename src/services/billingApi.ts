import { createApi } from "@reduxjs/toolkit/query/react";
import { base_url } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";
import { fileTimestamp } from "@/features/billing/format";
import type {
  ActivityType,
  BillingDistrict,
  BillingRegion,
  BlobDownload,
  Bolim,
  ChangeRenterPayload,
  ContractCounts,
  ContractDetail,
  ContractFile,
  ContractFileCreateArgs,
  ContractFilesParams,
  ContractFilters,
  ContractGeoList,
  ContractHistoryItem,
  ContractListItem,
  ContractListParams,
  ContractStatusPayload,
  ContractSummary,
  ContractSummaryParams,
  ContractWritePayload,
  ImportExcelPayload,
  ImportExcelResponse,
  LandType,
  PageParams,
  Paginated,
  PrivilegeType,
  RenterListItem,
  UUID,
  Xojalik,
  XojalikKontur,
  XojalikKonturDetail,
  XojalikLocation,
  XojalikLocationDetail,
  YearlyAmountsPayload,
  YearlyAmountsResponse,
} from "@/features/billing/types";

type QueryValue = string | number | boolean | null | undefined;

/** Bo'sh/null/false qiymatlarni tashlab query-string yasaydi; `true` → "1". */
export const buildBillingQuery = (params?: Record<string, QueryValue> | object): string => {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params as Record<string, QueryValue>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === false) return;
    sp.set(key, value === true ? "1" : String(value));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};

/** `Content-Disposition` dan fayl nomini ajratadi (filename*=UTF-8'' yoki filename=). */
export const parseContentDispositionFilename = (
  header: string | null,
  fallback: string,
): string => {
  if (!header) return fallback;
  const utf8 = header.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // oddiy filename'ga o'tamiz
    }
  }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/);
  return plain?.[1]?.trim() || fallback;
};

/** Blob javob: muvaffaqiyatda `{blob, filename}`, xatoda JSON/matn (error.data). */
const blobResponseHandler =
  (fallbackName: () => string) =>
  async (response: Response): Promise<BlobDownload | unknown> => {
    if (!response.ok) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    const blob = await response.blob();
    const filename = parseContentDispositionFilename(
      response.headers.get("content-disposition"),
      fallbackName(),
    );
    return { blob, filename };
  };

const REF = "BillingRef" as const;
const CONTRACTS = "BillingContracts" as const;
const FILES = "BillingFiles" as const;

export const billingApi = createApi({
  reducerPath: "billingApi",
  baseQuery: createBaseQueryWithReauth(`${base_url}/billing`),
  tagTypes: [CONTRACTS, FILES, REF],
  endpoints: (builder) => ({
    // =====================================================================
    // Ma'lumotnoma (sahifalanmagan)
    // =====================================================================
    getBillingRegions: builder.query<BillingRegion[], void>({
      query: () => "/regions/",
      providesTags: [{ type: REF, id: "regions" }],
    }),
    getBillingDistricts: builder.query<BillingDistrict[], { region?: UUID | "" } | void>({
      query: (params) => `/districts/${buildBillingQuery(params ?? undefined)}`,
      providesTags: [{ type: REF, id: "districts" }],
    }),
    getXojaliklar: builder.query<Xojalik[], { region?: UUID | ""; search?: string } | void>({
      query: (params) => `/xojaliklar/${buildBillingQuery(params ?? undefined)}`,
      providesTags: [{ type: REF, id: "xojaliklar" }],
    }),
    getBolimlar: builder.query<Bolim[], { xojalik?: UUID | ""; region?: UUID | "" } | void>({
      query: (params) => `/bolimlar/${buildBillingQuery(params ?? undefined)}`,
      providesTags: [{ type: REF, id: "bolimlar" }],
    }),
    getLandTypes: builder.query<LandType[], void>({
      query: () => "/land-types/",
      providesTags: [{ type: REF, id: "land-types" }],
    }),
    getActivityTypes: builder.query<ActivityType[], void>({
      query: () => "/activity-types/",
      providesTags: [{ type: REF, id: "activity-types" }],
    }),
    getPrivilegeTypes: builder.query<PrivilegeType[], void>({
      query: () => "/privilege-types/",
      providesTags: [{ type: REF, id: "privilege-types" }],
    }),
    getRenters: builder.query<Paginated<RenterListItem>, ({ search?: string } & PageParams) | void>({
      query: (params) => `/renters/${buildBillingQuery(params ?? undefined)}`,
      providesTags: [{ type: REF, id: "renters" }],
    }),

    // =====================================================================
    // Shartnomalar
    // =====================================================================
    getContracts: builder.query<Paginated<ContractListItem>, ContractListParams | void>({
      query: (params) => `/contracts/${buildBillingQuery(params ?? undefined)}`,
      providesTags: (result) =>
        result
          ? [
              { type: CONTRACTS, id: "LIST" },
              ...result.results.map((c) => ({ type: CONTRACTS, id: c.id })),
            ]
          : [{ type: CONTRACTS, id: "LIST" }],
    }),
    getContract: builder.query<ContractDetail, UUID>({
      query: (id) => `/contracts/${id}/`,
      providesTags: (_result, _error, id) => [{ type: CONTRACTS, id }],
    }),
    createContract: builder.mutation<ContractDetail, ContractWritePayload>({
      query: (body) => ({ url: "/contracts/", method: "POST", body }),
      invalidatesTags: [{ type: CONTRACTS, id: "LIST" }, { type: REF, id: "renters" }],
    }),
    updateContract: builder.mutation<ContractDetail, { id: UUID; body: ContractWritePayload }>({
      query: ({ id, body }) => ({ url: `/contracts/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: CONTRACTS, id: "LIST" },
        { type: CONTRACTS, id },
        { type: REF, id: "renters" },
      ],
    }),
    changeContractStatus: builder.mutation<ContractDetail, { id: UUID; body: ContractStatusPayload }>({
      query: ({ id, body }) => ({ url: `/contracts/${id}/status/`, method: "POST", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: CONTRACTS, id: "LIST" },
        { type: CONTRACTS, id },
      ],
    }),
    updateContractYearlyAmounts: builder.mutation<
      YearlyAmountsResponse,
      { id: UUID; body: YearlyAmountsPayload }
    >({
      query: ({ id, body }) => ({ url: `/contracts/${id}/yearly-amounts/`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: CONTRACTS, id: "LIST" },
        { type: CONTRACTS, id },
      ],
    }),
    changeContractRenter: builder.mutation<ContractDetail, { id: UUID; body: ChangeRenterPayload }>({
      query: ({ id, body }) => ({ url: `/contracts/${id}/change-renter/`, method: "POST", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: CONTRACTS, id: "LIST" },
        { type: CONTRACTS, id },
        { type: REF, id: "renters" },
      ],
    }),
    getContractHistory: builder.query<ContractHistoryItem[], UUID>({
      query: (id) => `/contracts/${id}/history/`,
      providesTags: (_result, _error, id) => [{ type: CONTRACTS, id: `history-${id}` }, { type: CONTRACTS, id }],
    }),
    getContractsSummary: builder.query<ContractSummary, ContractSummaryParams | void>({
      query: (params) => `/contracts/summary/${buildBillingQuery(params ?? undefined)}`,
      providesTags: [{ type: CONTRACTS, id: "LIST" }],
    }),
    getContractsCounts: builder.query<ContractCounts, Omit<ContractFilters, "status"> | void>({
      query: (params) => `/contracts/counts/${buildBillingQuery(params ?? undefined)}`,
      providesTags: [{ type: CONTRACTS, id: "LIST" }],
    }),
    /** `status` berilmasa backend faqat `active` qaytaradi. */
    getContractsGeoList: builder.query<ContractGeoList, ContractFilters | void>({
      query: (params) => `/contracts/geo-list/${buildBillingQuery(params ?? undefined)}`,
      providesTags: [{ type: CONTRACTS, id: "LIST" }],
    }),
    exportContractsExcel: builder.mutation<BlobDownload, ContractFilters | void>({
      query: (params) => ({
        url: `/contracts/export-excel/${buildBillingQuery(params ?? undefined)}`,
        method: "GET",
        responseHandler: blobResponseHandler(() => `shartnomalar-${fileTimestamp()}.xlsx`),
        cache: "no-cache",
      }),
    }),
    downloadImportTemplate: builder.mutation<BlobDownload, void>({
      query: () => ({
        url: "/contracts/import-template/",
        method: "GET",
        responseHandler: blobResponseHandler(() => "shartnoma-import-namuna.xlsx"),
        cache: "no-cache",
      }),
    }),
    importContractsExcel: builder.mutation<ImportExcelResponse, ImportExcelPayload>({
      query: (body) => ({ url: "/contracts/import-excel/", method: "POST", body }),
      invalidatesTags: [{ type: CONTRACTS, id: "LIST" }, { type: REF, id: "renters" }],
    }),

    // =====================================================================
    // Fayllar
    // =====================================================================
    getContractFiles: builder.query<Paginated<ContractFile>, ContractFilesParams>({
      query: (params) => `/contract-files/${buildBillingQuery(params)}`,
      providesTags: (_result, _error, { contract }) => [{ type: FILES, id: contract }, { type: FILES, id: "LIST" }],
    }),
    uploadContractFile: builder.mutation<ContractFile, ContractFileCreateArgs>({
      query: ({ contract, file, description }) => {
        const form = new FormData();
        form.append("contract", contract);
        form.append("file", file);
        if (description) form.append("description", description);
        return { url: "/contract-files/", method: "POST", body: form };
      },
      invalidatesTags: (_result, _error, { contract }) => [
        { type: FILES, id: contract },
        { type: CONTRACTS, id: contract },
        { type: CONTRACTS, id: "LIST" },
      ],
    }),
    deleteContractFile: builder.mutation<void, { id: UUID; contract: UUID }>({
      query: ({ id }) => ({ url: `/contract-files/${id}/`, method: "DELETE" }),
      invalidatesTags: (_result, _error, { contract }) => [
        { type: FILES, id: contract },
        { type: CONTRACTS, id: contract },
        { type: CONTRACTS, id: "LIST" },
      ],
    }),

    // =====================================================================
    // GIS
    // =====================================================================
    getXojalikLocations: builder.query<XojalikLocation[], { region?: UUID | "" } | void>({
      query: (params) => `/xojalik-locations/${buildBillingQuery(params ?? undefined)}`,
      providesTags: [{ type: REF, id: "xojalik-locations" }],
      keepUnusedDataFor: 600,
    }),
    /** Ro'yxatdan farqli `boundary_geojson` ham keladi (katta bo'lishi mumkin). */
    getXojalikLocation: builder.query<XojalikLocationDetail, UUID>({
      query: (id) => `/xojalik-locations/${id}/`,
      providesTags: (_result, _error, id) => [{ type: REF, id: `xojalik-location-${id}` }],
      keepUnusedDataFor: 600,
    }),
    getXojalikKonturs: builder.query<XojalikKontur[], UUID>({
      query: (xojalikLocationId) => `/xojalik-konturs/${buildBillingQuery({ xojalik_location: xojalikLocationId })}`,
      providesTags: (_result, _error, id) => [{ type: REF, id: `konturs-${id}` }],
      keepUnusedDataFor: 600,
    }),
    getXojalikKontur: builder.query<XojalikKonturDetail, UUID>({
      query: (id) => `/xojalik-konturs/${id}/`,
      providesTags: (_result, _error, id) => [{ type: REF, id: `kontur-${id}` }],
      keepUnusedDataFor: 600,
    }),
  }),
});

export const {
  // Ma'lumotnoma
  useGetBillingRegionsQuery,
  useGetBillingDistrictsQuery,
  useGetXojaliklarQuery,
  useGetBolimlarQuery,
  useGetLandTypesQuery,
  useGetActivityTypesQuery,
  useGetPrivilegeTypesQuery,
  useGetRentersQuery,
  useLazyGetRentersQuery,
  // Shartnomalar
  useGetContractsQuery,
  useLazyGetContractsQuery,
  useGetContractQuery,
  useLazyGetContractQuery,
  useCreateContractMutation,
  useUpdateContractMutation,
  useChangeContractStatusMutation,
  useUpdateContractYearlyAmountsMutation,
  useChangeContractRenterMutation,
  useGetContractHistoryQuery,
  useLazyGetContractHistoryQuery,
  useGetContractsSummaryQuery,
  useGetContractsCountsQuery,
  useGetContractsGeoListQuery,
  useLazyGetContractsGeoListQuery,
  useExportContractsExcelMutation,
  useDownloadImportTemplateMutation,
  useImportContractsExcelMutation,
  // Fayllar
  useGetContractFilesQuery,
  useUploadContractFileMutation,
  useDeleteContractFileMutation,
  // GIS
  useGetXojalikLocationsQuery,
  useGetXojalikLocationQuery,
  useLazyGetXojalikLocationQuery,
  useGetXojalikKontursQuery,
  useLazyGetXojalikKontursQuery,
  useGetXojalikKonturQuery,
  useLazyGetXojalikKonturQuery,
} = billingApi;
