// Ijara billing — `/api/v1/billing/` API shartnomasi turlari (spec §3.3).
// Decimal maydonlar backend'dan string sifatida keladi (COERCE_DECIMAL_TO_STRING),
// sanalar `dd.mm.yyyy` formatida.

export type UUID = string;
/** Backend Decimal — string ("1234.50"); kirishda number ham yuborish mumkin. */
export type DecimalString = string;
/** `dd.mm.yyyy` (chiqishda) yoki `dd.mm.yyyy`/`yyyy-mm-dd` (kirishda). */
export type DateString = string;

export type ContractStatus = "active" | "inactive";
export type ContractStatusFilter = ContractStatus | "all";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PageParams {
  page?: number;
  per_page?: number;
}

// ---------------------------------------------------------------------------
// Ma'lumotnoma
// ---------------------------------------------------------------------------

export interface BillingRegion {
  id: UUID;
  name: string;
  code: string;
}

export interface BillingDistrict {
  id: UUID;
  region: UUID;
  name: string;
  code: string;
}

export interface Xojalik {
  id: UUID;
  name: string;
  inn: string | null;
  code: string | null;
  region: UUID;
  region_name: string;
  is_active: boolean;
}

export interface Bolim {
  id: UUID;
  name: string;
  xojalik: UUID;
  xojalik_name: string;
}

export interface RefType {
  id: UUID;
  name: string;
  description: string | null;
  parent: UUID | null;
  parent_name: string | null;
}

export interface PrivilegeType extends RefType {
  month: number | null;
}

export type LandType = RefType;
export type ActivityType = RefType;

export interface RenterListItem {
  id: UUID;
  full_name: string;
  pinfl: string | null;
  stir: string | null;
  phone: string | null;
  passport: string | null;
  per_adr: string | null;
  citizenship: string | null;
  birth_place: string | null;
  contracts_count: number;
}

export interface RenterDetail extends Omit<RenterListItem, "contracts_count"> {
  is_legal_entity: boolean;
  legal_name: string | null;
  contracts_count?: number;
}

export interface RenterShort {
  id: UUID;
  full_name: string;
  pinfl: string | null;
  stir: string | null;
  phone: string | null;
  passport: string | null;
}

// ---------------------------------------------------------------------------
// Shartnoma filtrlari
// ---------------------------------------------------------------------------

export type ContractOrdering =
  | "contract_date"
  | "-contract_date"
  | "expired_date"
  | "-expired_date"
  | "rent_amount"
  | "-rent_amount"
  | "paid_amount"
  | "-paid_amount"
  | "rent_area"
  | "-rent_area"
  | "created_at"
  | "-created_at"
  | "xojalik__name"
  | "-xojalik__name";

export interface ContractFilters {
  status?: ContractStatusFilter | "";
  xojalik?: UUID | "";
  bolim?: UUID | "";
  region?: UUID | "";
  district?: UUID | "";
  /** renter pinfl yoki stir icontains */
  stir?: string;
  /** renter full_name icontains */
  fullname?: string;
  /** number yoki contract_number icontains */
  number?: string;
  from_date?: DateString | "";
  to_date?: DateString | "";
  /** `1` — faqat qarzdorlar (rent_amount > paid_amount) */
  debtors?: 1 | "1" | "" | boolean;
  search?: string;
  ordering?: ContractOrdering | "";
}

export type ContractListParams = ContractFilters & PageParams;

export interface ContractSummaryParams extends ContractFilters {
  year?: number | "";
}

// ---------------------------------------------------------------------------
// Shartnoma — o'qish
// ---------------------------------------------------------------------------

export interface ContractListItem {
  id: UUID;
  number: string;
  contract_number: string | null;
  status: ContractStatus;
  contract_date: DateString;
  expired_date: DateString | null;
  canceled_date: DateString | null;
  cancel_reason: string | null;
  xojalik: UUID;
  xojalik_name: string;
  xojalik_inn: string | null;
  bolim: UUID | null;
  bolim_name: string | null;
  region: UUID | null;
  region_name: string | null;
  district: UUID | null;
  district_name: string | null;
  renter: RenterShort;
  rent_area: DecimalString;
  rent_amount: DecimalString;
  paid_amount: DecimalString;
  penalty_amount: DecimalString;
  debt: DecimalString;
  latitude: DecimalString | null;
  longitude: DecimalString | null;
  has_boundary: boolean;
  files_count: number;
  days_remaining: number | null;
  is_expired: boolean;
  created_at: string;
}

export interface ContractYearlyAmount {
  id: UUID;
  year: number;
  contract_amount: DecimalString;
  calculated_amount: DecimalString;
  paid_amount: DecimalString;
  penalty_amount: DecimalString;
  debt_amount: DecimalString;
}

export interface ContractLand {
  id: UUID;
  type: UUID;
  type_name: string;
  parent_type: UUID | null;
  parent_type_name: string | null;
  area: DecimalString;
}

export interface ContractTypedArea {
  id: UUID;
  type: UUID;
  type_name: string;
  area: DecimalString;
}

export type ContractActivity = ContractTypedArea;
export type ContractPrivilege = ContractTypedArea;

export interface ContractActionProduct {
  id: UUID;
  product_export: string | null;
  product_amount: DecimalString | null;
  export_amount: DecimalString | null;
}

export interface ContractAction {
  id: UUID;
  vacancy: number | string | null;
  own_investment: DecimalString | null;
  products: ContractActionProduct[];
}

export interface ContractFileItem {
  id: UUID;
  file_name: string;
  file_url: string;
  description: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface ContractFile extends ContractFileItem {
  contract: UUID;
}

export type GeoJsonGeometry =
  | { type: "Point"; coordinates: number[] }
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }
  | { type: "GeometryCollection"; geometries: GeoJsonGeometry[] }
  | { type: string; coordinates?: unknown; geometries?: unknown };

export interface GeoJsonFeature {
  type: "Feature";
  geometry: GeoJsonGeometry | null;
  properties?: Record<string, unknown> | null;
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

/** Backend `boundary_geojson` — Feature, FeatureCollection yoki geometriya. */
export type BoundaryGeoJson =
  | GeoJsonFeatureCollection
  | GeoJsonFeature
  | GeoJsonGeometry;

export interface ContractDetail extends ContractListItem {
  boundary_geojson: BoundaryGeoJson | null;
  cadastral_number: string | null;
  circle: string | null;
  section: string | null;
  counter: string | null;
  massive: string | null;
  auction_date: DateString | null;
  exemptioned_date: DateString | null;
  is_entity: boolean;
  renter: RenterDetail;
  yearly_amounts: ContractYearlyAmount[];
  lands: ContractLand[];
  activities: ContractActivity[];
  privileges: ContractPrivilege[];
  action: ContractAction | null;
  files: ContractFileItem[];
}

// ---------------------------------------------------------------------------
// Shartnoma — yozish (ContractWritePayload)
// ---------------------------------------------------------------------------

export type NumericInput = number | string | null;

export interface ContractWriteContract {
  contract_date?: DateString;
  expired_date?: DateString | null;
  contract_number?: string | null;
  xojalik?: UUID;
  bolim?: UUID | null;
  region?: UUID | null;
  district?: UUID | null;
  rent_amount?: NumericInput;
  paid_amount?: NumericInput;
  penalty_amount?: NumericInput;
  rent_area?: NumericInput;
  cadastral_number?: string | null;
  circle?: string | null;
  section?: string | null;
  counter?: string | null;
  massive?: string | null;
  latitude?: NumericInput;
  longitude?: NumericInput;
  boundary_geojson?: BoundaryGeoJson | null;
  auction_date?: DateString | null;
  exemptioned_date?: DateString | null;
}

export interface ContractWriteRenter {
  id?: UUID;
  pinfl?: string | null;
  stir?: string | null;
  full_name?: string;
  passport?: string | null;
  phone?: string | null;
  per_adr?: string | null;
  citizenship?: string | null;
  birth_place?: string | null;
  is_legal_entity?: boolean;
  legal_name?: string | null;
}

export interface ContractWriteTypedArea {
  id?: UUID;
  /** UUID; import'da nom ham bo'lishi mumkin */
  type: UUID | string;
  area: NumericInput;
  delete?: boolean;
}

export interface ContractWriteAction {
  id?: UUID;
  vacancy?: NumericInput;
  own_investment?: NumericInput;
}

export interface ContractWriteActionProduct {
  id?: UUID;
  product_export?: string | null;
  product_amount?: NumericInput;
  export_amount?: NumericInput;
  delete?: boolean;
}

export interface ContractWriteYearlyAmount {
  year: number;
  contract_amount?: NumericInput;
  calculated_amount?: NumericInput;
  paid_amount?: NumericInput;
  penalty_amount?: NumericInput;
}

export interface ContractWritePayload {
  contract?: ContractWriteContract;
  renter?: ContractWriteRenter;
  lands?: ContractWriteTypedArea[];
  activities?: ContractWriteTypedArea[];
  privileges?: ContractWriteTypedArea[];
  action?: ContractWriteAction | null;
  action_products?: ContractWriteActionProduct[];
  yearly_amounts?: ContractWriteYearlyAmount[];
}

export type ContractWriteSection =
  | "contract"
  | "renter"
  | "lands"
  | "activities"
  | "privileges"
  | "action"
  | "action_products"
  | "yearly_amounts";

/** 400 → `{"errors": {"contract": {"field": "xabar"}, ...}}` */
export type FieldErrors = Record<string, string | string[] | Record<string, unknown>>;
export type ContractWriteErrors = Partial<Record<ContractWriteSection, FieldErrors | FieldErrors[] | string>>;
export interface ContractWriteErrorResponse {
  errors?: ContractWriteErrors;
  detail?: string;
}

export interface ContractStatusPayload {
  status: ContractStatus;
  cancel_reason?: string;
}

export interface YearlyAmountsPayload {
  yearly_amounts: ContractWriteYearlyAmount[];
}

export interface YearlyAmountsResponse {
  yearly_amounts: ContractYearlyAmount[];
  rent_amount: DecimalString;
  paid_amount: DecimalString;
  penalty_amount: DecimalString;
  debt: DecimalString;
}

export interface ChangeRenterPayload {
  renter: UUID;
}

export type ContractHistoryReason =
  | "created"
  | "updated"
  | "status_changed"
  | "renter_changed"
  | "yearly_updated"
  | "file_added"
  | "file_deleted"
  | "imported";

export interface ContractHistoryItem {
  id: UUID;
  reason: ContractHistoryReason;
  data: Record<string, unknown> | null;
  executor_name: string | null;
  created_at: string;
}

export interface ContractSummary {
  total_count: number;
  total_rent_area: DecimalString;
  total_rent_amount: DecimalString;
  total_paid_amount: DecimalString;
  total_penalty_amount: DecimalString;
  total_debt: DecimalString;
}

export interface ContractCountsGroup {
  all: number;
  active: number;
  inactive: number;
}

export interface ContractCounts extends ContractCountsGroup {
  added_today: ContractCountsGroup;
}

export interface ContractGeoItem {
  id: UUID;
  number: string;
  contract_number: string | null;
  status: ContractStatus;
  latitude: DecimalString | null;
  longitude: DecimalString | null;
  boundary_geojson: BoundaryGeoJson | null;
  rent_area: DecimalString;
  debt: DecimalString;
  xojalik_name: string;
  renter_name: string;
  activity_name: string | null;
}

export interface ContractGeoList {
  count: number;
  results: ContractGeoItem[];
}

export interface BlobDownload {
  blob: Blob;
  filename: string;
}

// ---------------------------------------------------------------------------
// Excel import
// ---------------------------------------------------------------------------

export interface ImportRowContract extends ContractWriteContract {
  xojalik_inn?: string | null;
  /** nom bo'lishi ham mumkin */
  xojalik?: string;
  bolim?: string | null;
  region_code?: string | null;
  district_code?: string | null;
  canceled_date?: DateString | null;
  cancel_reason?: string | null;
}

export interface ImportRow extends Omit<ContractWritePayload, "contract"> {
  contract: ImportRowContract;
}

export interface ImportExcelPayload {
  rows: ImportRow[];
}

export interface ImportExcelResponse {
  /** `rows` ichidagi 0-asosli indekslar */
  saved: number[];
  /** indeks (string) → bo'lim → maydon → xabar */
  errors: Record<string, ContractWriteErrors>;
}

// ---------------------------------------------------------------------------
// Fayllar
// ---------------------------------------------------------------------------

export interface ContractFilesParams extends PageParams {
  contract: UUID;
}

export interface ContractFileCreateArgs {
  contract: UUID;
  file: File;
  description?: string;
}

// ---------------------------------------------------------------------------
// GIS
// ---------------------------------------------------------------------------

export type LatLngBoundsTuple = [[number, number], [number, number]];

export interface XojalikLocation {
  id: UUID;
  name: string;
  region: UUID;
  region_name: string;
  xojalik: UUID | null;
  xojalik_name: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  bounds: LatLngBoundsTuple | null;
  area_ga: number | string | null;
  parcel_count: number | null;
}

export interface XojalikLocationDetail extends XojalikLocation {
  boundary_geojson: BoundaryGeoJson | null;
}

export interface XojalikKontur {
  id: UUID;
  kontur_raqami: string;
  area_ga: number | string | null;
}

export interface XojalikKonturDetail extends XojalikKontur {
  xojalik_location: UUID;
  xojalik_name: string;
  region_name: string;
  latitude: number | string | null;
  longitude: number | string | null;
  bounds: LatLngBoundsTuple | null;
  attributes: Record<string, string | number | null> | null;
  geojson: BoundaryGeoJson | null;
}

export interface ViloyatOption {
  id: UUID;
  name: string;
}

// =====================================================================
// Ijara tushumi statistikasi (rent-stats)
// =====================================================================

export interface RentStatsParams {
  from_year: number;
  to_year: number;
  xojalik?: UUID | "";
}

export interface RentStatsYear {
  year: number;
  total_area: number;
  total_calculated: number;
  price_per_hectare: number;
}

export interface RentStats {
  from_year: number;
  to_year: number;
  years: RentStatsYear[];
  average_annual: number;
  growth: { diff: number; percent: number };
  /** Ma'lumot bo'lmasa backend `null` qaytarishi mumkin. */
  max: { year: number; total_calculated: number } | null;
}

/** `GET public/xojaliklar/` (autentifikatsiyasiz). */
export interface PublicXojalik {
  id: UUID;
  name: string;
}
