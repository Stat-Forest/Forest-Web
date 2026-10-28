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
}

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
  | "execution";

export type ReturnReason = "address" | "lines" | "supplier" | "documents" | "norms" | "other";
export type OrderAction = "edit" | "submit" | "review" | "forward" | "return" | "accept";

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
}

export interface OrderLineOut {
  id: UUID;
  catalog_item: CatalogItem;
  qty: string;
  unit_cyr: string;
  attrs_note: string;
  position: number;
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

export interface DocumentVersionShort {
  id: UUID;
  version_no: number;
  status: "unsigned" | "signed" | "superseded" | "cancelled";
  qr_token: string;
  signatures: SignatureOut[];
}

export interface DocumentVersionFull extends DocumentVersionShort {
  template_version: number;
  content: OrderFormContent;
  content_hash: string;
  created_at: string;
}

export interface OrderDocument {
  id: UUID;
  kind: "order_form" | "act";
  number: string;
  current_version: DocumentVersionShort | null;
  versions: DocumentVersionShort[];
}

export interface OrderFormContent {
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
  doc_type: "order_form" | "act";
  number: string | null;
  version_no: number;
  date: string | null;
  status: "valid" | "unsigned" | "superseded" | "cancelled";
  is_current: boolean;
  parties: { mahalla: string; supplier: string };
  signatures: { role: string; signed_at: string; valid: boolean }[];
  checked_at: string;
}
