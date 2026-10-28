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
