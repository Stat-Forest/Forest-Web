export type UUID = string;

export type MemberType = "mahalla" | "union" | "supplier" | "observer";
export type SupplierType = "forest" | "dm";
export type ItemType = "goods" | "service";
export type Unit = "tup" | "dona" | "komplekt" | "daraxt" | "kg" | "metr" | "ga";

export interface YashilRegion {
  id: UUID;
  code: string;
  name: string;
}

export interface YashilDistrict {
  id: UUID;
  code: string;
  name: string;
  region_id: UUID;
}

export interface MahallaShort {
  id: UUID;
  source_code: string | null;
  name: string;
  region_name: string;
  district: YashilDistrict;
  address: string;
}

export interface Mahalla {
  id: UUID;
  source_code: string | null;
  name: string;
  region: YashilRegion;
  district: YashilDistrict;
  address: string;
  is_active: boolean;
}

export interface UnionUnit {
  id: UUID;
  name: string;
  level: "republic" | "region" | "district";
  region_id: UUID | null;
  district_id: UUID | null;
}

export interface Cabinet {
  id: UUID;
  member_type: MemberType;
  name: string;
  mahalla: MahallaShort | null;
  union_unit: UnionUnit | null;
  organization: { id: UUID; name: string; region: string } | null;
  supplier_type: SupplierType | null;
  can_prepare: boolean;
  can_sign: boolean;
  position_title: string;
  phone: string;
  observer_scope: { regions?: string[]; districts?: string[] };
}

export interface YashilMe {
  user: { id: UUID; full_name: string; role: string };
  is_admin: boolean;
  is_member: boolean;
  active_cabinet: Cabinet | null;
  cabinets: Cabinet[];
  rules: { review_workdays: number; delivery_workdays: number };
  unread_notifications?: number;
}

export interface Supplier {
  id: UUID;
  name: string;
  supplier_type: SupplierType;
  region: string;
  parent_id: UUID | null;
}

export interface SuppliersForMahalla {
  mahalla: { id: UUID; name: string };
  forest: {
    primary: Supplier | null;
    assignment_valid_to: string | null;
    alternatives: Supplier[];
    message: string | null;
  };
  dm: { options: Supplier[] };
  union: UnionUnit | null;
  union_message: string | null;
  /** [[janub, g'arb], [shimol, sharq]]: bounds — viloyat (xarita shu yerda ochiladi), limits — nuqta qabul qilinadigan hudud */
  map?: { bounds: MapBox | null; limits: MapBox };
}

export type MapBox = [[number, number], [number, number]];

export interface CatalogItem {
  id: UUID;
  code: string;
  name_cyr: string;
  name_lat: string;
  supplier_type: SupplierType;
  item_type: ItemType;
  category: string;
  unit: Unit;
  precision: number;
  attributes: Record<string, string>;
  version: number;
}

export interface Season {
  id: UUID;
  year: number;
  kind: "spring" | "autumn" | "year";
  date_from: string;
  date_to: string;
  label_cyr: string;
}

export interface ObjectType {
  id: UUID;
  code: string;
  name_cyr: string;
  name_lat: string;
  requires_note: boolean;
}

export interface CalendarDay {
  id: UUID;
  date: string;
  kind: "holiday" | "workday";
  note: string;
  source_ref: string;
}

export interface DueDates {
  start: string;
  review_due: string;
  delivery_due: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Backend xato shartnomasi (TZ §21). */
export interface YashilApiError {
  error_code: string;
  field: string | null;
  message: string;
  request_id: string;
  detail?: unknown;
}

// ============================================================================ 2-bosqich: buyurtmalar
export type OrderState =
  | "draft"
  | "union_new"
  | "union_review"
  | "returned"
  | "supplier_new"
  | "supplier_review"
  | "execution"
  | "partial"
  | "closed"
  | "cancelled";

export type ReturnReason = "address" | "lines" | "supplier" | "documents" | "norms" | "other";
export type OrderAction =
  | "edit"
  | "submit"
  | "review"
  | "forward"
  | "return"
  | "accept"
  | "create_act"
  | "cancel"
  | "cancel_request"
  | "cancel_agree"
  | "cancel_reject"
  | "cancel_approve";

export interface DeadlineInfo {
  stage: "review" | "delivery" | null;
  review_due: string | null;
  review_used: number | null;
  delivery_due: string | null;
  late_workdays: number;
}

export interface OrderListItem {
  id: UUID;
  number: string | null;
  display_number: string;
  title: string;
  route: SupplierType;
  state: OrderState;
  state_cyr: string;
  version_no: number;
  mahalla_name: string;
  supplier_name: string;
  area_ha: string | null;
  created_at: string;
  last_submitted_at: string | null;
  delivery_due: string | null;
  deadline: DeadlineInfo;
  /** Tungi hisob (kecha/ertalab): kechikkan ish kunlari va bosqich (TZ §14.2 filtri bilan bir manba). */
  late_workdays: number;
  overdue_stage: "review" | "delivery" | "";
}

export interface OrderLineOut {
  id: UUID;
  catalog_item: CatalogItem;
  qty: string;
  unit_cyr: string;
  attrs_note: string;
  position: number;
  /** Ikki imzoli aktlar bo'yicha qabul qilingan va qolgan hajm (3-bosqich). */
  accepted_qty: string | null;
  remaining_qty: string | null;
}

export interface SignatureOut {
  id: UUID;
  role: "mahalla" | "supplier";
  signer_cn: string;
  signer_tin: string;
  signed_at: string;
  mode: "document" | "challenge";
  is_valid: boolean;
  cert_serial: string;
  cert_valid_to: string;
}

export type DocumentStatus = "unsigned" | "partly_signed" | "signed" | "superseded" | "cancelled";
export type DocumentKind = "order_form" | "act" | "cancellation";

export interface DocumentVersionShort {
  id: UUID;
  version_no: number;
  status: DocumentStatus;
  qr_token: string;
  signatures: SignatureOut[];
}

export type DocumentContent = OrderFormContent | ActContent | CancellationContent;

export interface DocumentVersionFull extends DocumentVersionShort {
  template_version: number;
  content: DocumentContent;
  content_hash: string;
  created_at: string;
}

export interface OrderDocument {
  id: UUID;
  kind: DocumentKind;
  number: string;
  current_version: DocumentVersionShort | null;
  versions: DocumentVersionShort[];
}

/** Hujjat tili (D-28): yaratilgan paytdagi platforma tili; yo'q bo'lsa — eski hujjat, kirillda. */
export type DocumentLang = "uz" | "ru";

export interface OrderFormContent {
  doc_type: "order_form";
  lang?: DocumentLang;
  number: string | null;
  version_no: number;
  date: string | null;
  supplier_name: string;
  mahalla_name: string;
  region: string;
  district: string;
  full_address: string;
  title: string;
  object_type: string | null;
  season: string | null;
  point: string;
  area_ha: string;
  subject_phrase: string;
  lines: { n: number; name: string; attrs: string; qty: string; unit: string; item_type: ItemType; code: string }[];
  extra_info: string;
  attachments_text: string;
  signer: { full_name: string; position: string; phone: string; authority: string };
}

/** Dalolatnoma mazmuni (TZ §12.1). */
export interface ActContent {
  doc_type: "act";
  lang?: DocumentLang;
  number: string;
  act_index: number;
  version_no: number;
  date: string | null;
  is_partial: boolean;
  place: string;
  order_number: string;
  order_date: string;
  supplier_name: string;
  mahalla_name: string;
  region: string;
  district: string;
  object_text: string;
  lines: { n: number; order_line_id: UUID; code: string; name: string; attrs: string; qty: string; unit: string; ordered_qty: string; item_type: ItemType }[];
  delivery_date: string;
  planned_date: string | null;
  responsible: string;
  delivery_address: string;
  note: string;
  attachments_text: string;
  deliverer: { name: string; full_name: string; position: string };
  receiver: { name: string; full_name: string; position: string };
}

/** Bekor qilish hujjati mazmuni. */
export interface CancellationContent {
  doc_type: "cancellation";
  lang?: DocumentLang;
  number: string;
  order_number: string;
  version_no: number;
  date: string;
  mahalla_name: string;
  supplier_name: string;
  requested_by: string;
  agreed_by: string;
  approved_by: string;
  reason: string;
  is_full: boolean;
  lines: { n: number; order_line_id: UUID; code: string; name: string; unit: string; ordered_qty: string; accepted_qty: string; cancelled_qty: string }[];
  result: "cancelled" | "closed" | "partial";
  result_cyr: string;
  result_label?: string;
}

export interface OrderVersionOut {
  id: UUID;
  version_no: number;
  submitted_at: string | null;
  superseded_at: string | null;
  document_version_id: UUID | null;
}

export interface OrderEventOut {
  id: number;
  action: string;
  from_state: string;
  to_state: string;
  actor_name: string;
  actor_label: string;
  comment: string;
  reason_code: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface OrderAttachmentOut {
  id: UUID;
  version_no: number;
  original_name: string;
  size: number;
  kind: "photo" | "scheme" | "pdf" | "other";
  url: string | null;
  created_at: string;
}

export interface OrderDetail extends OrderListItem {
  mahalla: { id: UUID; name: string; district: string; region: string; source_code: string | null };
  supplier: { id: UUID; name: string; supplier_type: SupplierType };
  union_unit: { id: UUID; name: string } | null;
  object_type: { id: UUID; code: string; name_cyr: string; name_lat: string } | null;
  object_note: string;
  season: { id: UUID; year: number; kind: string; label_cyr: string } | null;
  address: string;
  lat: string | null;
  lon: string | null;
  polygon: unknown | null;
  area_calc_ha: string | null;
  area_note: string;
  water_source: string;
  contact_person: string;
  extra_info: string;
  base_seedlings: number | null;
  problem_note: string;
  linked_order: UUID | null;
  repeat_reason: string;
  first_submitted_at: string | null;
  accepted_at: string | null;
  executor_name: string;
  lines: OrderLineOut[];
  versions: OrderVersionOut[];
  documents: OrderDocument[];
  events: OrderEventOut[];
  attachments: OrderAttachmentOut[];
  actions: OrderAction[];
  last_return: { comment: string; reason_code: ReturnReason; by: "union" | "supplier"; fields: string[]; at: string; actor: string } | null;
  acceptance: AcceptanceOut | null;
  acts: ActListItem[];
  cancel_request: CancelRequestOut | null;
  closed_at: string | null;
}

// ============================================================================ 3-bosqich: ombor
export interface AcceptanceLine {
  order_line_id: UUID;
  code: string;
  name_cyr: string;
  unit: Unit;
  kind: "stock" | "capacity";
  qty: string;
  balance_before: string;
  balance_after: string;
  shortage: string;
  period: string | null;
}

export interface AcceptanceOut {
  id: UUID;
  warehouse: { id: UUID; name: string };
  accepted_on: string;
  delivery_due: string;
  executor_name: string;
  accepted_by: string;
  result: { warehouse: string; strict: boolean; has_shortage: boolean; lines: AcceptanceLine[] };
}

export interface StockRow {
  warehouse_id: UUID;
  catalog_item_id: UUID;
  code: string;
  name_cyr: string;
  name_lat: string;
  unit: Unit;
  precision: number;
  opening: string;
  received: string;
  allocated: string;
  released: string;
  returned: string;
  balance: string;
  shortage: string;
  pending_reversals: number;
}

export interface StockSummary {
  organization: { id: UUID; name: string; supplier_type: SupplierType | null };
  warehouse: { id: UUID; name: string };
  rows: StockRow[];
  shortage_count: number;
  pending_reversals: number;
  can_post: boolean;
  can_approve: boolean;
}

export type MovementKind = "opening" | "receipt" | "allocate" | "release" | "return_in" | "reversal";
export type MovementStatus = "posted" | "pending_approval" | "rejected";

export interface StockMovementOut {
  id: UUID;
  kind: MovementKind;
  status: MovementStatus;
  qty: string;
  catalog_item: { id: UUID; code: string; name_cyr: string; name_lat: string; unit: Unit };
  doc_number: string;
  doc_date: string | null;
  note: string;
  file_url: string | null;
  order_number: string | null;
  reversal_of: UUID | null;
  requested_by: string;
  approved_by_name: string;
  approved_at: string | null;
  decision_note: string;
  created_at: string;
}

export interface StockEntryIn {
  catalog_item: UUID;
  qty: string;
  doc_number: string;
  doc_date: string;
  note?: string;
  file?: File | null;
}

export interface StockEntryResult {
  movement: StockMovementOut;
  balance: string;
  warnings: { code: string; message: string }[];
}

export interface CapacityRow {
  catalog_item_id: UUID;
  code: string;
  name_cyr: string;
  name_lat: string;
  unit: Unit;
  capacity: string;
  used: string;
  available: string;
}

export interface SupplierOrgRow {
  id: UUID;
  name: string;
  supplier_type: SupplierType;
  region: string;
  shortage_count: number;
  pending_reversals: number;
}

// ============================================================================ 3-bosqich: dalolatnoma
export type ActStatus = "draft" | "mahalla_review" | "approved" | "returned" | "cancelled";
export type ActAction = "edit" | "attach" | "sign" | "cancel" | "approve" | "return";
export type ActReturnReason = "document" | "quantity" | "quality" | "not_delivered" | "other";

export interface ActLineOut {
  id: UUID;
  order_line: UUID;
  catalog_item: { id: UUID; code: string; name_cyr: string; name_lat: string; unit: Unit; precision: number };
  qty: string;
  ordered_qty: string;
  unit_cyr: string;
}

export interface ActVersionOut {
  id: UUID;
  version_no: number;
  delivery_date: string;
  planned_date: string | null;
  responsible: string;
  delivery_address: string;
  note: string;
  lines: ActLineOut[];
  document_version_id: UUID | null;
  submitted_at: string | null;
  superseded_at: string | null;
  created_at: string;
}

export interface ActAttachmentOut {
  id: UUID;
  version_no: number;
  original_name: string;
  size: number;
  kind: "photo" | "pdf" | "other";
  url: string | null;
  created_at: string;
}

export interface ActListItem {
  id: UUID;
  number: string;
  index: number;
  status: ActStatus;
  status_cyr: string;
  version_no: number;
  is_partial: boolean;
  order: { id: UUID; number: string | null; title: string; state: OrderState; state_cyr: string; mahalla_name: string; supplier_name: string; route: SupplierType };
  delivery_date: string | null;
  approved_at: string | null;
  returned_at: string | null;
  created_at: string;
  updated_at: string;
  actions: ActAction[];
}

export interface ActDetail extends ActListItem {
  current_version: ActVersionOut | null;
  versions: ActVersionOut[];
  attachments: ActAttachmentOut[];
  document: OrderDocument | null;
  last_return: { comment: string; reason_code: ActReturnReason; at: string; actor: string; version_no: number | null } | null;
}

export interface ActWrite {
  delivery_date: string;
  planned_date?: string | null;
  responsible?: string;
  delivery_address?: string;
  note?: string;
  lines: { order_line: UUID; qty: string }[];
}

export interface ActSignTask extends SigningTask {
  document_version_id: UUID;
  role: "supplier" | "mahalla";
  content_hash: string;
}

// ============================================================================ 3-bosqich: bekor qilish
export type CancelStatus = "requested" | "agreed" | "approved" | "rejected";

export interface CancelRequestOut {
  id: UUID;
  order: { id: UUID; number: string | null; title: string; state: OrderState; state_cyr: string; mahalla_name: string; supplier_name: string };
  requested_by_party: "mahalla" | "supplier";
  requested_by: { cabinet: string; name: string };
  is_full: boolean;
  lines: { order_line_id: UUID; code: string; name_cyr: string; unit: Unit; qty: string }[];
  reason: string;
  status: CancelStatus;
  status_cyr: string;
  agreed_by_name: string | null;
  agreed_at: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  decision_note: string;
  document: OrderDocument | null;
  result: { result?: string; released?: unknown[]; lines?: unknown[] };
  created_at: string;
}

export interface CancelWrite {
  reason: string;
  lines?: { order_line: UUID; qty: string }[];
}

export interface PdfInfo {
  url: string;
  filename: string;
  size: number;
  status: DocumentStatus;
  version_no: number;
  document_version_id: UUID;
}

export interface OrderLineIn {
  catalog_item: UUID;
  qty: string;
  attrs_note?: string;
}

export interface OrderWrite {
  route: SupplierType;
  supplier_org: UUID;
  title?: string;
  object_type?: UUID | null;
  object_note?: string;
  season?: UUID | null;
  address?: string;
  lat?: string | null;
  lon?: string | null;
  polygon?: unknown | null;
  area_ha?: string | null;
  area_calc_ha?: string | null;
  area_note?: string;
  water_source?: string;
  contact_person?: string;
  extra_info?: string;
  base_seedlings?: number | null;
  problem_note?: string;
  linked_order?: UUID | null;
  repeat_reason?: string;
  lines?: OrderLineIn[];
  version_no?: number;
}

export interface SigningTask {
  document_version: DocumentVersionFull;
  document: string;
  sign_text: string;
  mode: "document" | "challenge";
  nonce: string;
  expires_in: number;
}

export interface YashilNotificationOut {
  id: number;
  kind: string;
  title: string;
  body: string;
  order: UUID | null;
  order_number: string | null;
  read_at: string | null;
  created_at: string;
}

export interface PublicVerify {
  doc_type: DocumentKind;
  number: string | null;
  version_no: number;
  date: string | null;
  status: "valid" | "pending_signature" | "unsigned" | "superseded" | "cancelled" | "tampered";
  is_current: boolean;
  is_partial: boolean | null;
  order_number: string | null;
  parties: { mahalla: string; supplier: string };
  signatures: { role: string; signed_at: string; valid: boolean }[];
  missing_roles: ("supplier" | "mahalla")[];
  checked_at: string;
}


// ===================================================================== 4-bosqich: hisobot, statistika, xarita
export type PeriodBasis = "submitted" | "accepted" | "delivered";

/** Reestr/statistika/xarita filtrlari (backend `reports.parse_filters`). */
export interface ReportFilterParams {
  period_basis?: PeriodBasis;
  date_from?: string;
  date_to?: string;
  region?: UUID;
  district?: UUID;
  mahalla?: UUID;
  supplier_org?: UUID;
  route?: SupplierType | "";
  catalog_item?: UUID;
  category?: string;
  state?: string;
  overdue?: boolean;
  q?: string;
  ordering?: string;
  page?: number;
  per_page?: number;
}

export interface RegistryRow {
  row_no: number;
  order_id: UUID;
  line_id: UUID;
  number: string | null;
  title: string;
  route: SupplierType;
  route_cyr: string;
  state: OrderState;
  state_cyr: string;
  responsible_cyr: string;
  mahalla: string;
  mahalla_id: UUID;
  district: string;
  region: string;
  supplier: string;
  supplier_id: UUID;
  item: string;
  /** Nom lotinda (uz/ru interfeysi uchun) */
  item_lat?: string;
  item_code: string;
  category: string;
  unit: Unit;
  unit_cyr: string;
  qty: string;
  accepted_qty: string;
  remaining_qty: string;
  first_submitted_on: string | null;
  last_submitted_at: string | null;
  /** Oxirgi yuborish sanasi (Asia/Tashkent) — `first_submitted_on` bilan solishtirish uchun. */
  last_submitted_on: string | null;
  review_due: string | null;
  accepted_on: string | null;
  delivery_due: string | null;
  late_workdays: number;
  overdue_stage: "review" | "delivery" | "";
  overdue_stage_cyr: string;
  executor_name: string;
  act_numbers: string;
  last_delivery_date: string | null;
  address: string;
  lat: string | null;
  lon: string | null;
  area_ha: string | null;
}

export interface RegistryPage extends Paginated<RegistryRow> {
  filters_label: string;
}

export interface RegistryItemTotal {
  item_code: string;
  item: string;
  /** Nom lotinda (uz/ru interfeysi uchun) */
  item_lat?: string;
  unit: Unit;
  unit_cyr: string;
  ordered: string;
  accepted: string;
  remaining: string;
  orders: number;
  lines: number;
}

export interface RegistrySummary {
  orders: number;
  lines: number;
  by_item: RegistryItemTotal[];
  by_state: Partial<Record<OrderState, number>>;
  overdue_orders: number;
  filters_label: string;
}

export interface ReportDictionaries {
  suppliers: { id: UUID; name: string; supplier_type: SupplierType }[];
  items: { id: UUID; code: string; name_cyr: string; name_lat: string; supplier_type: SupplierType; category: string; unit: Unit }[];
  states: { value: OrderState; label: string }[];
  period_bases: { value: PeriodBasis; label: string }[];
  routes: { value: SupplierType; label: string }[];
}

export type ExportKind = "registry" | "acts";
export type ExportFormat = "xlsx" | "csv" | "pdf";
export type ExportStatus = "queued" | "running" | "done" | "failed" | "expired";

export interface ExportJobOut {
  id: UUID;
  kind: ExportKind;
  format: ExportFormat;
  status: ExportStatus;
  row_count: number;
  filters: Record<string, unknown>;
  error: string;
  created_at: string;
  finished_at: string | null;
  url: string | null;
  filename: string | null;
}

export interface StatsCards {
  total: number;
  new: number;
  new_union: number;
  new_supplier: number;
  reviewing: number;
  reviewing_union: number;
  reviewing_supplier: number;
  reviewed: number;
  execution: number;
  partial: number;
  done: number;
  returned: number;
  cancelled: number;
  overdue: number;
  overdue_review: number;
  overdue_delivery: number;
  filters_label: string;
}

export interface SeedlingRow {
  item_code: string;
  item: string;
  /** Nom lotinda (uz/ru interfeysi uchun) */
  item_lat?: string;
  unit: Unit;
  unit_cyr: string;
  orders: number;
  ordered: string;
  accepted: string;
  pending: string;
  returned_open: string;
  diff: string;
}

export interface SeedlingStats {
  items: SeedlingRow[];
  totals: { ordered: string; accepted: string; pending: string; returned_open: string; diff: string };
  filters_label: string;
}

export interface OrgLagRow {
  kind: "supplier" | "union";
  id: UUID;
  name: string;
  total: number;
  in_progress: number;
  done: number;
  waiting: number;
  review_late: number;
  delivery_late: number;
  late: number;
  max_late_days: number;
  has_late: boolean;
  done_pct: string;
}

export interface MapPoint {
  id: UUID;
  number: string | null;
  title: string;
  state: OrderState;
  state_cyr: string;
  route: SupplierType;
  lat: string;
  lon: string;
  mahalla: string;
  supplier: string;
  address: string;
  area_ha: string | null;
  lines: { item: string; item_lat?: string; unit_cyr: string; qty: string; accepted: string }[];
  accepted_on: string | null;
  delivery_due: string | null;
  late_workdays: number;
}

export interface MapPoints {
  count: number;
  points: MapPoint[];
}


// ===================================================================== 4b: modul administratori
export interface AdminUserHit {
  id: UUID;
  email: string;
  full_name: string;
  role: string;
  organization: string;
  memberships: number;
}

export interface AdminMembership {
  id: UUID;
  user: UUID;
  user_info: { id: UUID; email: string; full_name: string; role: string };
  member_type: MemberType;
  mahalla: UUID | null;
  union_unit: UUID | null;
  organization: UUID | null;
  cabinet_name: string;
  can_prepare: boolean;
  can_sign: boolean;
  position_title: string;
  phone: string;
  authority_doc_number: string;
  authority_doc_date: string | null;
  authority_file: boolean;
  observer_scope: { regions?: string[]; districts?: string[] };
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  is_current: boolean;
}

export type AdminMembershipWrite = Partial<Omit<AdminMembership, "id" | "user_info" | "cabinet_name" | "authority_file" | "is_current">>;

export interface AdminCalendarDay {
  id: UUID;
  date: string;
  kind: "holiday" | "workday";
  note: string;
  source_ref: string;
  version: number;
}

export interface AdminMahalla {
  id: UUID;
  source_code: string | null;
  name: string;
  region: { id: UUID; code: string; name: string };
  district: { id: UUID; code: string; name: string };
  address: string;
  is_active: boolean;
  valid_from: string;
  valid_to: string | null;
}

export interface AdminUnionUnit {
  id: UUID;
  name: string;
  level: "republic" | "region" | "district";
  region: UUID | null;
  district: UUID | null;
  parent: UUID | null;
  stir: string;
  is_active: boolean;
  region_name: string;
  district_name: string;
  mahallas: number;
}

export interface AdminSupplier {
  id: UUID;
  organization: UUID;
  organization_name: string;
  supplier_type: SupplierType;
  parent: UUID | null;
  official_name: string;
  stir: string;
  is_active_supplier: boolean;
  service_regions: UUID[];
  service_districts: UUID[];
  members: number;
}

export interface AdminOrgHit {
  id: UUID;
  name: string;
  region: string;
  is_supplier: boolean;
  supplier_type: SupplierType | null;
}

export interface AdminAssignment {
  id: UUID;
  mahalla: UUID;
  mahalla_name: string;
  organization: UUID;
  organization_name: string;
  valid_from: string;
  valid_to: string | null;
  source_doc: string;
  is_current: boolean;
}

export interface AdminRoute {
  id: UUID;
  mahalla: UUID;
  mahalla_name: string;
  union_unit: UUID;
  union_unit_name: string;
  valid_from: string;
  valid_to: string | null;
  source_doc: string;
  is_current: boolean;
}

export interface AdminCatalogItem extends CatalogItem {
  is_active: boolean;
  effective_from: string | null;
  order: number;
}

export interface RuleRow {
  key: string;
  label: string;
  type: "int" | "bool";
  min: number | null;
  max: number | null;
  default: number | boolean;
  value: number | boolean;
  pending: { value: number | boolean; effective_from: string; version: number }[];
  history: { version: number; value: number | boolean; effective_from: string; note: string; changed_by: string; created_at: string }[];
}

export interface AuditRow {
  id: number;
  created_at: string;
  user: string;
  action: "add" | "change" | "delete";
  model_name: string;
  object_id: string | null;
  object_repr: string;
  change_message: string;
}

export interface ImportResultOut {
  dry_run: boolean;
  applied: boolean;
  created: number;
  updated: number;
  unchanged: number;
  errors: { row: number; message: string }[];
  error_count: number;
}

export type ImportKind = "mahallas" | "assignments" | "routes" | "calendar" | "opening";
