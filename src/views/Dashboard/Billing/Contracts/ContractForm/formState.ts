// Shartnoma yaratish/tahrirlash formasi — holat, validatsiya, payload.
// Billing `composables/useContractResourcesModify.ts` porti (Vue reactive →
// React useReducer). Barcha qiymatlar satr (input'lar bilan 1:1), payload
// yig'ishda raqam/sana formatiga o'giriladi.
import type { TFunction } from "i18next";
import { YEARS } from "@/features/billing/constants";
import { formatDate, toApiDate, toInputDate, toNumberOrNull } from "@/features/billing/format";
import type {
  BoundaryGeoJson,
  ContractDetail,
  ContractWriteErrors,
  ContractWritePayload,
  ContractWriteTypedArea,
  ContractWriteYearlyAmount,
  LandType,
} from "@/features/billing/types";

// ---------------------------------------------------------------------------
// Tablar
// ---------------------------------------------------------------------------

export type TabId = "contract" | "renter" | "land" | "lands" | "activities" | "privileges" | "action";

export const TAB_ORDER: TabId[] = ["contract", "renter", "land", "lands", "activities", "privileges", "action"];

export const TAB_LABEL_KEY: Record<TabId, string> = {
  contract: "billing.form_tab_contract",
  renter: "billing.form_tab_renter",
  land: "billing.form_tab_land",
  lands: "billing.form_tab_land_types",
  activities: "billing.form_tab_activities",
  privileges: "billing.form_tab_privileges",
  action: "billing.form_tab_actions",
};

// ---------------------------------------------------------------------------
// Holat
// ---------------------------------------------------------------------------

export interface ContractSection {
  contract_date: string; // yyyy-MM-dd (input type=date)
  expired_date: string;
  auction_date: string;
  exemptioned_date: string;
  contract_number: string;
  rent_amount: string; // xom raqam satri ("1500000" yoki "1500000.50")
  paid_amount: string;
  penalty_amount: string;
  xojalik: string; // UUID
  xojalik_inn: string; // yordamchi input — INN bo'yicha avtomatik tanlash
  bolim: string;
  region: string;
  district: string;
}

export interface RenterSection {
  id: string | null;
  stir: string;
  pinfl: string;
  full_name: string;
  passport: string;
  phone: string; // faqat raqamlar (998...), payload'da "+" qo'shiladi
  citizenship: string;
  birth_place: string;
  per_adr: string;
  is_legal_entity: boolean;
  legal_name: string;
}

export interface LandInfoSection {
  circle: string;
  section: string;
  counter: string;
  massive: string;
  rent_area: string;
  cadastral_number: string;
  latitude: string;
  longitude: string;
  boundary_geojson: BoundaryGeoJson | null;
}

export interface TypedAreaRow {
  key: string; // lokal kalit (React key)
  id?: string; // backend id (tahrirlashda)
  /** Yer turlari uchun: ota tur; qolganlarda ishlatilmaydi */
  parentType: string;
  type: string;
  area: string;
}

export interface ActionSection {
  id?: string;
  vacancy: string;
  own_investment: string;
}

export interface ProductRow {
  key: string;
  id?: string;
  product_export: string;
  product_amount: string;
  export_amount: string;
}

export interface YearlyRow {
  year: number;
  contract_amount: string;
  calculated_amount: string;
  paid_amount: string;
  penalty_amount: string;
}

export type TypedSection = "lands" | "activities" | "privileges";

export interface ContractFormState {
  contract: ContractSection;
  renter: RenterSection;
  landInfo: LandInfoSection;
  lands: TypedAreaRow[];
  activities: TypedAreaRow[];
  privileges: TypedAreaRow[];
  action: ActionSection;
  products: ProductRow[];
  yearly: YearlyRow[];
  /** O'chirilgan (backend id'li) qatorlar — payload'da `{id, delete: true}` */
  deleted: Record<TypedSection | "products", string[]>;
  /** Tahrirlashda yuklangan shartnoma id'si */
  loadedId: string | null;
}

let keySeq = 0;
export const nextKey = (): string => `k${++keySeq}`;

export const emptyTypedRow = (): TypedAreaRow => ({ key: nextKey(), parentType: "", type: "", area: "" });
export const emptyProductRow = (): ProductRow => ({
  key: nextKey(),
  product_export: "",
  product_amount: "",
  export_amount: "",
});
export const emptyYearlyRows = (): YearlyRow[] =>
  YEARS.map((year) => ({
    year,
    contract_amount: "",
    calculated_amount: "",
    paid_amount: "",
    penalty_amount: "",
  }));

export const createInitialState = (): ContractFormState => ({
  contract: {
    contract_date: "",
    expired_date: "",
    auction_date: "",
    exemptioned_date: "",
    contract_number: "",
    rent_amount: "",
    paid_amount: "",
    penalty_amount: "",
    xojalik: "",
    xojalik_inn: "",
    bolim: "",
    region: "",
    district: "",
  },
  renter: {
    id: null,
    stir: "",
    pinfl: "",
    full_name: "",
    passport: "",
    phone: "",
    citizenship: "",
    birth_place: "",
    per_adr: "",
    is_legal_entity: false,
    legal_name: "",
  },
  landInfo: {
    circle: "",
    section: "",
    counter: "",
    massive: "",
    rent_area: "",
    cadastral_number: "",
    latitude: "",
    longitude: "",
    boundary_geojson: null,
  },
  lands: [emptyTypedRow()],
  activities: [emptyTypedRow()],
  privileges: [emptyTypedRow()],
  action: { vacancy: "", own_investment: "" },
  products: [emptyProductRow()],
  yearly: emptyYearlyRows(),
  deleted: { lands: [], activities: [], privileges: [], products: [] },
  loadedId: null,
});

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export type FormAction =
  | { type: "reset" }
  | { type: "load"; detail: ContractDetail }
  | { type: "contract"; field: keyof ContractSection; value: string }
  | { type: "contract_patch"; patch: Partial<ContractSection> }
  | { type: "renter"; field: keyof RenterSection; value: string | boolean }
  | { type: "landInfo"; field: keyof LandInfoSection; value: string }
  | { type: "landInfo_patch"; patch: Partial<LandInfoSection> }
  | { type: "typed_update"; section: TypedSection; index: number; patch: Partial<Pick<TypedAreaRow, "parentType" | "type" | "area">> }
  | { type: "typed_add"; section: TypedSection }
  | { type: "typed_remove"; section: TypedSection; index: number }
  | { type: "action"; field: keyof ActionSection; value: string }
  | { type: "product_update"; index: number; field: keyof Omit<ProductRow, "key" | "id">; value: string }
  | { type: "product_add" }
  | { type: "product_remove"; index: number }
  | { type: "yearly"; index: number; field: keyof Omit<YearlyRow, "year">; value: string }
  | { type: "yearly_set"; rows: YearlyRow[] };

const decimalToInput = (value: string | number | null | undefined): string => {
  const n = toNumberOrNull(value);
  if (n === null) return "";
  return Number.isInteger(n) ? String(n) : String(n);
};

/** Backend `ContractDetail` → forma holati (billing updateContractState & co). */
export const stateFromDetail = (detail: ContractDetail): ContractFormState => {
  const base = createInitialState();
  const action = detail.action;
  const yearlyByYear = new Map(detail.yearly_amounts.map((y) => [y.year, y]));
  return {
    ...base,
    loadedId: detail.id,
    contract: {
      contract_date: toInputDate(detail.contract_date),
      expired_date: toInputDate(detail.expired_date),
      auction_date: toInputDate(detail.auction_date),
      exemptioned_date: toInputDate(detail.exemptioned_date),
      contract_number: detail.contract_number ?? "",
      rent_amount: decimalToInput(detail.rent_amount),
      paid_amount: decimalToInput(detail.paid_amount),
      penalty_amount: decimalToInput(detail.penalty_amount),
      xojalik: detail.xojalik ?? "",
      xojalik_inn: detail.xojalik_inn ?? "",
      bolim: detail.bolim ?? "",
      region: detail.region ?? "",
      district: detail.district ?? "",
    },
    renter: {
      id: detail.renter?.id ?? null,
      stir: detail.renter?.stir ?? "",
      pinfl: detail.renter?.pinfl ?? "",
      full_name: detail.renter?.full_name ?? "",
      passport: detail.renter?.passport ?? "",
      phone: (detail.renter?.phone ?? "").replace(/^\+/, ""),
      citizenship: detail.renter?.citizenship ?? "",
      birth_place: detail.renter?.birth_place ?? "",
      per_adr: detail.renter?.per_adr ?? "",
      is_legal_entity: !!detail.renter?.is_legal_entity,
      legal_name: detail.renter?.legal_name ?? "",
    },
    landInfo: {
      circle: detail.circle ?? "",
      section: detail.section ?? "",
      counter: detail.counter ?? "",
      massive: detail.massive ?? "",
      rent_area: decimalToInput(detail.rent_area),
      cadastral_number: detail.cadastral_number ?? "",
      latitude: detail.latitude ? decimalToInput(detail.latitude) : "",
      longitude: detail.longitude ? decimalToInput(detail.longitude) : "",
      boundary_geojson: detail.boundary_geojson ?? null,
    },
    lands: detail.lands.length
      ? detail.lands.map((l) => ({
          key: nextKey(),
          id: l.id,
          // Ichki tur bo'lsa: ota = parent_type, tur = type; ota turning o'zi
          // saqlangan bo'lsa: ota = type, tur bo'sh
          parentType: l.parent_type ?? l.type,
          type: l.parent_type ? l.type : "",
          area: decimalToInput(l.area),
        }))
      : [emptyTypedRow()],
    activities: detail.activities.length
      ? detail.activities.map((a) => ({ key: nextKey(), id: a.id, parentType: "", type: a.type, area: decimalToInput(a.area) }))
      : [emptyTypedRow()],
    privileges: detail.privileges.length
      ? detail.privileges.map((p) => ({ key: nextKey(), id: p.id, parentType: "", type: p.type, area: decimalToInput(p.area) }))
      : [emptyTypedRow()],
    action: {
      id: action?.id,
      vacancy: action?.vacancy !== null && action?.vacancy !== undefined ? String(action.vacancy) : "",
      own_investment: decimalToInput(action?.own_investment),
    },
    products: action?.products?.length
      ? action.products.map((p) => ({
          key: nextKey(),
          id: p.id,
          product_export: p.product_export ?? "",
          product_amount: decimalToInput(p.product_amount),
          export_amount: decimalToInput(p.export_amount),
        }))
      : [emptyProductRow()],
    yearly: YEARS.map((year) => {
      const found = yearlyByYear.get(year);
      return {
        year,
        contract_amount: decimalToInput(found?.contract_amount),
        calculated_amount: decimalToInput(found?.calculated_amount),
        paid_amount: decimalToInput(found?.paid_amount),
        penalty_amount: decimalToInput(found?.penalty_amount),
      };
    }),
  };
};

export const formReducer = (state: ContractFormState, action: FormAction): ContractFormState => {
  switch (action.type) {
    case "reset":
      return createInitialState();
    case "load":
      return stateFromDetail(action.detail);
    case "contract":
      return { ...state, contract: { ...state.contract, [action.field]: action.value } };
    case "contract_patch":
      return { ...state, contract: { ...state.contract, ...action.patch } };
    case "renter": {
      const prev = state.renter[action.field];
      const next: RenterSection = { ...state.renter, [action.field]: action.value };
      // INN va JSHSHIR — bittasi to'ldirilishi kerak. Maydon BO'SH holatdan
      // to'ldirilganda ikkinchisi tozalanadi; allaqachon to'ldirilgan maydon
      // tahrirlansa (eski yozuvlarda ikkalasi ham bo'lishi mumkin) — tegilmaydi.
      if (typeof action.value === "string" && action.value && !prev) {
        if (action.field === "stir") next.pinfl = "";
        else if (action.field === "pinfl") next.stir = "";
      }
      return { ...state, renter: next };
    }
    case "landInfo":
      return { ...state, landInfo: { ...state.landInfo, [action.field]: action.value } };
    case "landInfo_patch":
      return { ...state, landInfo: { ...state.landInfo, ...action.patch } };
    case "typed_update": {
      const rows = state[action.section].map((row, i) => {
        if (i !== action.index) return row;
        const next = { ...row, ...action.patch };
        // Ota tur o'zgarsa ichki tur tozalanadi
        if (action.patch.parentType !== undefined && action.patch.parentType !== row.parentType && action.patch.type === undefined) {
          next.type = "";
        }
        return next;
      });
      return { ...state, [action.section]: rows };
    }
    case "typed_add":
      return { ...state, [action.section]: [...state[action.section], emptyTypedRow()] };
    case "typed_remove": {
      const row = state[action.section][action.index];
      const deleted = row?.id ? [...state.deleted[action.section], row.id] : state.deleted[action.section];
      return {
        ...state,
        [action.section]: state[action.section].filter((_, i) => i !== action.index),
        deleted: { ...state.deleted, [action.section]: deleted },
      };
    }
    case "action":
      return { ...state, action: { ...state.action, [action.field]: action.value } };
    case "product_update":
      return {
        ...state,
        products: state.products.map((p, i) => (i === action.index ? { ...p, [action.field]: action.value } : p)),
      };
    case "product_add":
      return { ...state, products: [...state.products, emptyProductRow()] };
    case "product_remove": {
      const row = state.products[action.index];
      return {
        ...state,
        products: state.products.filter((_, i) => i !== action.index),
        deleted: { ...state.deleted, products: row?.id ? [...state.deleted.products, row.id] : state.deleted.products },
      };
    }
    case "yearly":
      return {
        ...state,
        yearly: state.yearly.map((r, i) => (i === action.index ? { ...r, [action.field]: action.value } : r)),
      };
    case "yearly_set":
      return { ...state, yearly: action.rows };
    default:
      return state;
  }
};

// ---------------------------------------------------------------------------
// Yordamchilar
// ---------------------------------------------------------------------------

export const isTypeSelected = (value: string): boolean => value !== "" && value !== "-1";
export const isFilled = (value: string): boolean => value.trim() !== "";
export const digitsOf = (value: string): string => value.replace(/\D/g, "");

export const yearlyRowHasValue = (row: YearlyRow): boolean =>
  [row.contract_amount, row.calculated_amount, row.paid_amount, row.penalty_amount].some(
    (v) => v !== "" && Number(v) !== 0,
  );

export const hasYearlyData = (rows: YearlyRow[]): boolean => rows.some(yearlyRowHasValue);

export interface YearlyTotals {
  calculated: number;
  paid: number;
  penalty: number;
  debt: number;
}

export const yearlyTotals = (rows: YearlyRow[]): YearlyTotals => {
  const sum = (field: keyof Omit<YearlyRow, "year">) =>
    rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
  const calculated = sum("calculated_amount");
  const paid = sum("paid_amount");
  return { calculated, paid, penalty: sum("penalty_amount"), debt: calculated - paid };
};

/**
 * Yer turi qatori uchun backendga yuboriladigan tur: ichki tur tanlangan
 * bo'lsa — u; ota turning ichki turlari umuman bo'lmasa — ota turning o'zi
 * (billing'da bunday qator jimgina tashlab yuborilardi).
 */
export const effectiveLandType = (row: TypedAreaRow, landTypes: LandType[] | undefined): string => {
  if (isTypeSelected(row.type)) return row.type;
  if (!isTypeSelected(row.parentType)) return "";
  const hasChildren = (landTypes ?? []).some((lt) => lt.parent === row.parentType);
  return hasChildren ? "" : row.parentType;
};

// ---------------------------------------------------------------------------
// Validatsiya
// ---------------------------------------------------------------------------

export type ErrorKind = "required" | "format";

export interface FieldError {
  tab: TabId;
  kind: ErrorKind;
  message: string;
}

/** Kalit: "contract.contract_date", "lands.0.area", "products.1.export_amount" ... */
export type FieldErrorMap = Record<string, FieldError>;

const inRange = (value: string, min: number, max: number): boolean => {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
};

export const validateForm = (
  state: ContractFormState,
  t: TFunction,
  landTypes: LandType[] | undefined,
): FieldErrorMap => {
  const errors: FieldErrorMap = {};
  const add = (key: string, tab: TabId, kind: ErrorKind, message: string) => {
    if (!errors[key]) errors[key] = { tab, kind, message };
  };

  // --- Shartnoma
  const c = state.contract;
  if (!isTypeSelected(c.xojalik)) add("contract.xojalik", "contract", "required", t("billing.form_err_xojalik_required"));
  if (!isFilled(c.contract_date)) add("contract.contract_date", "contract", "required", t("billing.form_err_contract_date_required"));
  if (isFilled(c.contract_date) && isFilled(c.expired_date) && c.expired_date <= c.contract_date) {
    add("contract.expired_date", "contract", "format", t("billing.form_err_expired_before"));
  }
  if (isFilled(c.rent_amount) && !inRange(c.rent_amount, 0, 1_000_000_000_000)) {
    add("contract.rent_amount", "contract", "format", t("billing.form_err_rent_amount_range"));
  }
  if (isFilled(c.paid_amount) && !inRange(c.paid_amount, 0, 1_000_000_000_000)) {
    add("contract.paid_amount", "contract", "format", t("billing.form_err_paid_amount_range"));
  }
  if (isFilled(c.penalty_amount) && !inRange(c.penalty_amount, 0, 1_000_000_000_000)) {
    add("contract.penalty_amount", "contract", "format", t("billing.form_err_paid_amount_range"));
  }
  state.yearly.forEach((row, i) => {
    (["contract_amount", "calculated_amount", "paid_amount", "penalty_amount"] as const).forEach((f) => {
      if (isFilled(row[f]) && !inRange(row[f], 0, Number.MAX_SAFE_INTEGER)) {
        add(`yearly.${i}.${f}`, "contract", "format", t("billing.form_err_yearly_number"));
      }
    });
  });

  // --- Ijarachi
  const r = state.renter;
  const stirFilled = isFilled(r.stir);
  const pinflFilled = isFilled(r.pinfl);
  if (!stirFilled && !pinflFilled) {
    add("renter.stir", "renter", "required", t("billing.form_err_stir_or_pinfl"));
    add("renter.pinfl", "renter", "required", t("billing.form_err_stir_or_pinfl"));
  }
  if (stirFilled && !/^\d{9}$/.test(r.stir.trim())) add("renter.stir", "renter", "format", t("billing.form_err_stir_len"));
  if (pinflFilled && !/^\d{14}$/.test(r.pinfl.trim())) add("renter.pinfl", "renter", "format", t("billing.form_err_pinfl_len"));
  if (isFilled(r.full_name) && (r.full_name.length < 5 || r.full_name.length > 255)) {
    add("renter.full_name", "renter", "format", t("billing.form_err_full_name_len"));
  }
  if (isFilled(r.passport) && r.passport.trim().length !== 9) add("renter.passport", "renter", "format", t("billing.form_err_passport_len"));
  if (isFilled(r.phone) && digitsOf(r.phone).length !== 12) add("renter.phone", "renter", "format", t("billing.form_err_phone_len"));
  (["citizenship", "birth_place", "per_adr"] as const).forEach((f) => {
    if (isFilled(r[f]) && (r[f].length < 5 || r[f].length > 255)) add(`renter.${f}`, "renter", "format", t("billing.form_err_text_len"));
  });

  // --- Yer haqida
  const li = state.landInfo;
  (["circle", "section", "counter", "massive"] as const).forEach((f) => {
    if (isFilled(li[f]) && !inRange(li[f], 0, 999_999_999)) add(`landInfo.${f}`, "land", "format", t("billing.form_err_land_number_range"));
  });
  if (!isFilled(li.rent_area)) {
    add("landInfo.rent_area", "land", "required", t("billing.form_err_rent_area_required"));
  } else if (!inRange(li.rent_area, 0.01, 999_999_999)) {
    add("landInfo.rent_area", "land", "format", t("billing.form_err_rent_area_range"));
  }
  if (isFilled(li.latitude) && !inRange(li.latitude, -90, 90)) add("landInfo.latitude", "land", "format", t("billing.form_err_coord"));
  if (isFilled(li.longitude) && !inRange(li.longitude, -180, 180)) add("landInfo.longitude", "land", "format", t("billing.form_err_coord"));

  // --- Turlar (turi tanlanmagan qator e'tiborga olinmaydi)
  const checkTyped = (section: TypedSection, tab: TabId, rows: TypedAreaRow[], typeOf: (row: TypedAreaRow) => string) => {
    rows.forEach((row, i) => {
      if (!isTypeSelected(typeOf(row))) return;
      if (isFilled(row.area) && !inRange(row.area, 0.01, 999_999_999)) {
        add(`${section}.${i}.area`, tab, "format", t("billing.form_err_area_range"));
      }
    });
  };
  checkTyped("lands", "lands", state.lands, (row) => effectiveLandType(row, landTypes));
  checkTyped("activities", "activities", state.activities, (row) => row.type);
  checkTyped("privileges", "privileges", state.privileges, (row) => row.type);

  // --- Bajarilgan ishlar
  const a = state.action;
  if (isFilled(a.own_investment) && Number(a.own_investment) > 0 && !inRange(a.own_investment, 1000, 999_999_999)) {
    add("action.own_investment", "action", "format", t("billing.form_err_investment_range"));
  }
  if (isFilled(a.vacancy) && Number(a.vacancy) > 0 && !inRange(a.vacancy, 1, 9999)) {
    add("action.vacancy", "action", "format", t("billing.form_err_vacancy_range"));
  }
  state.products.forEach((p, i) => {
    if (isFilled(p.export_amount) && Number(p.export_amount) > 0 && !inRange(p.export_amount, 1, 999_999_999)) {
      add(`products.${i}.export_amount`, "action", "format", t("billing.form_err_export_amount_range"));
    }
    if (isFilled(p.product_export) && (p.product_export.length < 1 || p.product_export.length > 99)) {
      add(`products.${i}.product_export`, "action", "format", t("billing.form_err_product_export_len"));
    }
    if (isFilled(p.product_amount) && Number(p.product_amount) > 0 && !inRange(p.product_amount, 1, 999_999_999)) {
      add(`products.${i}.product_amount`, "action", "format", t("billing.form_err_product_amount_range"));
    }
  });

  return errors;
};

export const tabsWithErrors = (errors: FieldErrorMap, sectionErrors?: Partial<Record<TabId, string[]>>): TabId[] => {
  const set = new Set<TabId>();
  Object.values(errors).forEach((e) => set.add(e.tab));
  if (sectionErrors) {
    (Object.keys(sectionErrors) as TabId[]).forEach((tab) => {
      if (sectionErrors[tab]?.length) set.add(tab);
    });
  }
  return TAB_ORDER.filter((tab) => set.has(tab));
};

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

const orNull = (value: string): string | null => (value.trim() === "" ? null : value.trim());
const numOrZero = (value: string): string => (value.trim() === "" ? "0" : value.trim());
const numOrNull = (value: string): string | null => (value.trim() === "" ? null : value.trim());
const dateOrNull = (value: string): string | null => (value ? toApiDate(value) || null : null);

export const buildPayload = (
  state: ContractFormState,
  isEditing: boolean,
  landTypes: LandType[] | undefined,
): ContractWritePayload => {
  const c = state.contract;
  const li = state.landInfo;
  const r = state.renter;

  const typedItems = (rows: TypedAreaRow[], deletedIds: string[], typeOf: (row: TypedAreaRow) => string): ContractWriteTypedArea[] => [
    ...rows
      .filter((row) => isTypeSelected(typeOf(row)))
      .map((row) => {
        const item: ContractWriteTypedArea = { type: typeOf(row), area: isFilled(row.area) ? row.area.trim() : 0 };
        if (isEditing && row.id) item.id = row.id;
        return item;
      }),
    ...(isEditing ? deletedIds.map((id) => ({ id, type: "", area: 0, delete: true }) as ContractWriteTypedArea) : []),
  ];

  const phoneDigits = digitsOf(r.phone);

  const payload: ContractWritePayload = {
    contract: {
      contract_date: toApiDate(c.contract_date),
      expired_date: dateOrNull(c.expired_date),
      auction_date: dateOrNull(c.auction_date),
      exemptioned_date: dateOrNull(c.exemptioned_date),
      contract_number: orNull(c.contract_number),
      xojalik: c.xojalik,
      bolim: orNull(c.bolim),
      region: orNull(c.region),
      district: orNull(c.district),
      rent_amount: numOrZero(c.rent_amount),
      paid_amount: numOrZero(c.paid_amount),
      penalty_amount: numOrZero(c.penalty_amount),
      rent_area: numOrZero(li.rent_area),
      cadastral_number: orNull(li.cadastral_number),
      circle: orNull(li.circle),
      section: orNull(li.section),
      counter: orNull(li.counter),
      massive: orNull(li.massive),
      latitude: numOrNull(li.latitude),
      longitude: numOrNull(li.longitude),
      boundary_geojson: li.boundary_geojson ?? null,
    },
    renter: {
      ...(isEditing && r.id ? { id: r.id } : {}),
      pinfl: orNull(r.pinfl),
      stir: orNull(r.stir),
      full_name: r.full_name.trim(),
      passport: orNull(r.passport),
      phone: phoneDigits ? `+${phoneDigits}` : null,
      per_adr: orNull(r.per_adr),
      citizenship: orNull(r.citizenship),
      birth_place: orNull(r.birth_place),
      is_legal_entity: r.is_legal_entity || (!!orNull(r.stir) && !orNull(r.pinfl)),
      legal_name: orNull(r.legal_name),
    },
    lands: typedItems(state.lands, state.deleted.lands, (row) => effectiveLandType(row, landTypes)),
    activities: typedItems(state.activities, state.deleted.activities, (row) => row.type),
    privileges: typedItems(state.privileges, state.deleted.privileges, (row) => row.type),
    action: {
      ...(isEditing && state.action.id ? { id: state.action.id } : {}),
      vacancy: numOrNull(state.action.vacancy),
      own_investment: numOrNull(state.action.own_investment),
    },
    action_products: [
      ...state.products
        // Formada doim bitta bo'sh qator turadi — to'ldirilmagan yangi qatorlar yuborilmaydi
        .filter(
          (p) =>
            (isEditing && p.id) ||
            [p.product_export, p.product_amount, p.export_amount].some((v) => v.trim() !== ""),
        )
        .map((p) => ({
          ...(isEditing && p.id ? { id: p.id } : {}),
          product_export: orNull(p.product_export),
          product_amount: numOrNull(p.product_amount),
          export_amount: numOrNull(p.export_amount),
        })),
      ...(isEditing ? state.deleted.products.map((id) => ({ id, delete: true })) : []),
    ],
  };

  // Yillik summalar bor bo'lsa umumiy summalar backendda ulardan hisoblanadi
  // (sync_contract_totals) — eskirgan qo'lda kiritilgan qiymat yuborilmaydi
  if (hasYearlyData(state.yearly) && payload.contract) {
    delete payload.contract.rent_amount;
    delete payload.contract.paid_amount;
    delete payload.contract.penalty_amount;
  }

  // Yillik summalar yaratishda payload'ga kiradi; tahrirlashda ular alohida
  // PATCH yearly-amounts bilan saqlanadi (ContractForm o'zgargan bo'lsa qo'shadi)
  if (!isEditing) {
    const rows = state.yearly.filter(yearlyRowHasValue).map(yearlyRowToPayload);
    if (rows.length) payload.yearly_amounts = rows;
  }
  return payload;
};

export const yearlyRowToPayload = (row: YearlyRow): ContractWriteYearlyAmount => ({
  year: row.year,
  contract_amount: numOrZero(row.contract_amount),
  calculated_amount: numOrZero(row.calculated_amount),
  paid_amount: numOrZero(row.paid_amount),
  penalty_amount: numOrZero(row.penalty_amount),
});

// ---------------------------------------------------------------------------
// Backend xatolari → tab/maydon
// ---------------------------------------------------------------------------

const LAND_INFO_FIELDS = new Set([
  "circle",
  "section",
  "counter",
  "massive",
  "rent_area",
  "cadastral_number",
  "latitude",
  "longitude",
  "boundary_geojson",
]);

export interface ServerErrors {
  /** Maydon xatolari — forma holati kalitlari bilan ("contract.xojalik", "renter.pinfl", "landInfo.rent_area") */
  fields: Record<string, string>;
  /** Maydonga bog'lanmagan xatolar — tab bo'yicha ro'yxat */
  sections: Partial<Record<TabId, string[]>>;
}

export const flattenMessage = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(flattenMessage).filter(Boolean).join("; ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${flattenMessage(v)}`)
      .join("; ");
  }
  return String(value);
};

/** `{errors: {contract: {field: msg}, lands: {"Чўл": msg}, ...}}` → tab + maydon. */
/**
 * Payload'dagi ro'yxat indeksi → forma holatidagi qator indeksi (backend
 * ro'yxat xatolarini "N-yozuv" kaliti bilan qaytaradi; N — yuborilgan ro'yxatdagi
 * 1-asosli tartib).
 */
export type PayloadIndexMaps = Partial<Record<TypedSection | "products", number[]>>;

export const payloadIndexMaps = (state: ContractFormState, landTypes: LandType[] | undefined): PayloadIndexMaps => {
  const pick = (rows: TypedAreaRow[], typeOf: (row: TypedAreaRow) => string) =>
    rows.map((row, i) => (isTypeSelected(typeOf(row)) ? i : -1)).filter((i) => i >= 0);
  return {
    lands: pick(state.lands, (row) => effectiveLandType(row, landTypes)),
    activities: pick(state.activities, (row) => row.type),
    privileges: pick(state.privileges, (row) => row.type),
    products: state.products
      .map((p, i) =>
        p.id || [p.product_export, p.product_amount, p.export_amount].some((v) => v.trim() !== "") ? i : -1,
      )
      .filter((i) => i >= 0),
  };
};

const ROW_LABEL_RE = /^(\d+)-yozuv$/;
const YEARLY_KEY_RE = /^(\d{4})_(contract_amount|calculated_amount|paid_amount|penalty_amount)$/;

export const mapServerErrors = (
  errors: ContractWriteErrors | undefined | null,
  t: TFunction,
  indexMaps: PayloadIndexMaps = {},
  state?: ContractFormState,
): ServerErrors => {
  const result: ServerErrors = { fields: {}, sections: {} };
  if (!errors || typeof errors !== "object") return result;

  const pushSection = (tab: TabId, message: string) => {
    if (!message) return;
    (result.sections[tab] ??= []).push(message);
  };

  Object.entries(errors).forEach(([section, value]) => {
    if (value === null || value === undefined) return;
    const asFields = (tab: TabId, prefix: string, fieldToKey?: (f: string) => string | null) => {
      if (typeof value !== "object" || Array.isArray(value)) {
        pushSection(tab, flattenMessage(value));
        return;
      }
      Object.entries(value as Record<string, unknown>).forEach(([field, msg]) => {
        const message = flattenMessage(msg);
        const key = fieldToKey ? fieldToKey(field) : `${prefix}.${field}`;
        if (key) result.fields[key] = message;
        else pushSection(tab, field === "non_field_errors" || field === "xatolik" ? message : `${field}: ${message}`);
      });
    };

    switch (section) {
      case "contract":
        if (typeof value === "object" && !Array.isArray(value)) {
          Object.entries(value as Record<string, unknown>).forEach(([field, msg]) => {
            const message = flattenMessage(msg);
            if (LAND_INFO_FIELDS.has(field)) {
              if (field === "boundary_geojson") pushSection("land", message);
              else result.fields[`landInfo.${field}`] = message;
            } else if (field === "non_field_errors" || field === "xatolik" || field === "status") {
              pushSection("contract", message);
            } else {
              result.fields[`contract.${field}`] = message;
            }
          });
        } else pushSection("contract", flattenMessage(value));
        break;
      case "renter":
        asFields("renter", "renter", (f) => (f === "non_field_errors" || f === "id" ? null : `renter.${f}`));
        break;
      case "action":
        asFields("action", "action", (f) => (f === "vacancy" || f === "own_investment" ? `action.${f}` : null));
        break;
      case "action_products":
        asFields("action", "products", (f) => {
          const m = ROW_LABEL_RE.exec(f);
          let idx = m ? indexMaps.products?.[Number(m[1]) - 1] : undefined;
          if (idx === undefined && state) {
            const byName = state.products.findIndex((p) => p.product_export.trim() === f.trim());
            if (byName >= 0) idx = byName;
          }
          return idx === undefined ? null : `products.${idx}.row`;
        });
        break;
      case "lands":
      case "activities":
      case "privileges": {
        const typed = section as TypedSection;
        asFields(typed, typed, (f) => {
          const m = ROW_LABEL_RE.exec(f);
          const idx = m ? indexMaps[typed]?.[Number(m[1]) - 1] : undefined;
          return idx === undefined ? null : `${typed}.${idx}.row`;
        });
        break;
      }
      case "yearly_amounts":
        asFields("contract", "yearly", (f) => {
          const m = YEARLY_KEY_RE.exec(f);
          if (!m) return null;
          const idx = state ? state.yearly.findIndex((r) => r.year === Number(m[1])) : -1;
          return idx >= 0 ? `yearly.${idx}.${m[2]}` : null;
        });
        break;
      default:
        pushSection("contract", `${section}: ${flattenMessage(value)}`);
    }
  });

  // Bo'lim xatolari sarlavhasi uchun tarjima mavjudligini tekshirish shart emas —
  // xabarlar backenddan o'zbekcha keladi; `t` kelajakda lokalizatsiya uchun.
  void t;
  return result;
};

/** RTK Query xatosidan `errors` obyektini va umumiy xabarni ajratadi. */
export const extractWriteError = (error: unknown): { errors: ContractWriteErrors | null; message: string } => {
  const data = (error as { data?: unknown })?.data;
  if (data && typeof data === "object") {
    const record = data as { errors?: unknown; detail?: unknown; message?: unknown };
    if (record.errors && typeof record.errors === "object") {
      return { errors: record.errors as ContractWriteErrors, message: flattenMessage(record.detail ?? record.message ?? "") };
    }
    const detail = record.detail ?? record.message;
    if (typeof detail === "string") return { errors: null, message: detail };
    return { errors: null, message: flattenMessage(data) };
  }
  if (typeof data === "string" && data.trim()) return { errors: null, message: data };
  return { errors: null, message: "" };
};

/** Sana ko'rinishi (tablarda ko'rsatish uchun) */
export const displayDate = (input: string): string => (input ? formatDate(input) : "");

/** Server/klient xato kaliti ("landInfo.rent_area", "lands.0.row") → tab. */
export const tabOfErrorKey = (key: string): TabId => {
  const prefix = key.split(".")[0];
  switch (prefix) {
    case "renter":
      return "renter";
    case "landInfo":
      return "land";
    case "lands":
    case "activities":
    case "privileges":
      return prefix;
    case "action":
    case "products":
      return "action";
    default:
      return "contract";
  }
};

/** "1234567.5" → "1 234 567.5" */
export const formatThousands = (raw: string): string => {
  if (!raw) return "";
  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;
  const [int, frac] = body.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative ? "-" : ""}${grouped}${frac !== undefined ? `.${frac}` : ""}`;
};

