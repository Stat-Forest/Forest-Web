// Shartnomalar monitoring — filtr holati URL search params'da saqlanadi
// (billing'dagi route query bilan bir xil xatti-harakat). Bu modul URL ↔ UI
// holati ↔ API parametrlari o'rtasidagi aylantirishlarni jamlaydi.
import type { ContractFilters, ContractListParams, ContractStatusFilter, ContractSummaryParams } from "@/features/billing/types";
import { toApiDate, toInputDate } from "@/features/billing/format";
import { BILLING_YEAR_FROM, BILLING_YEAR_TO, CONTRACTS_PER_PAGE } from "@/features/billing/constants";

/** Filtr dialogi holati (UI). Sanalar `yyyy-mm-dd` (input[type=date]). */
export interface ContractsFilterState {
  stir: string;
  fullname: string;
  number: string;
  region: string;
  xojalik: string;
  bolim: string;
  from_date: string;
  to_date: string;
  debtors: boolean;
}

export const EMPTY_CONTRACTS_FILTERS: ContractsFilterState = {
  stir: "",
  fullname: "",
  number: "",
  region: "",
  xojalik: "",
  bolim: "",
  from_date: "",
  to_date: "",
  debtors: false,
};

export const FILTER_KEYS = Object.keys(EMPTY_CONTRACTS_FILTERS) as Array<keyof ContractsFilterState>;

export const hasActiveContractsFilters = (f: ContractsFilterState): boolean =>
  FILTER_KEYS.some((k) => (k === "debtors" ? f.debtors : f[k] !== ""));

/** URL'dagi `year`: "" → standart (joriy yil), "all" → barcha yillar, "2024" → yil. */
export type YearParam = number | "all";

const clampYear = (y: number): number => Math.min(BILLING_YEAR_TO, Math.max(BILLING_YEAR_FROM, y));

export const defaultYear = (): number => clampYear(new Date().getFullYear());

export interface ContractsUrlState {
  filters: ContractsFilterState;
  status: ContractStatusFilter;
  page: number;
  perPage: number;
  year: YearParam;
}

export const parseContractsSearchParams = (sp: URLSearchParams): ContractsUrlState => {
  const filters: ContractsFilterState = { ...EMPTY_CONTRACTS_FILTERS };
  FILTER_KEYS.forEach((k) => {
    const v = sp.get(k);
    if (v === null) return;
    if (k === "debtors") {
      filters.debtors = v === "1" || v === "true";
    } else if (k === "from_date" || k === "to_date") {
      filters[k] = toInputDate(v);
    } else {
      filters[k] = v;
    }
  });

  const statusRaw = sp.get("status");
  const status: ContractStatusFilter =
    statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "all";

  const pageRaw = Number(sp.get("page"));
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const perRaw = Number(sp.get("per_page"));
  const perPage = Number.isInteger(perRaw) && perRaw > 0 && perRaw <= 200 ? perRaw : CONTRACTS_PER_PAGE;

  const yearRaw = sp.get("year");
  let year: YearParam = defaultYear();
  if (yearRaw === "all") year = "all";
  else if (yearRaw && /^\d{4}$/.test(yearRaw)) year = clampYear(Number(yearRaw));

  return { filters, status, page, perPage, year };
};

/** Holat → URL search params (bo'sh/standart qiymatlar tashlab yuboriladi). */
export const buildContractsSearchParams = (state: ContractsUrlState): URLSearchParams => {
  const sp = new URLSearchParams();
  FILTER_KEYS.forEach((k) => {
    const v = state.filters[k];
    if (k === "debtors") {
      if (v) sp.set("debtors", "1");
    } else if (typeof v === "string" && v !== "") {
      sp.set(k, v);
    }
  });
  if (state.status !== "all") sp.set("status", state.status);
  if (state.page > 1) sp.set("page", String(state.page));
  if (state.perPage !== CONTRACTS_PER_PAGE) sp.set("per_page", String(state.perPage));
  if (state.year === "all") sp.set("year", "all");
  else if (state.year !== defaultYear()) sp.set("year", String(state.year));
  return sp;
};

/** UI filtrlar → API filtrlari (status'siz; counts endpoint'i uchun ham). */
export const filtersToApi = (f: ContractsFilterState): Omit<ContractFilters, "status"> => ({
  stir: f.stir.trim(),
  fullname: f.fullname.trim(),
  number: f.number.trim(),
  region: f.region,
  xojalik: f.xojalik,
  bolim: f.bolim,
  from_date: toApiDate(f.from_date),
  to_date: toApiDate(f.to_date),
  debtors: f.debtors ? 1 : "",
});

export const listParams = (state: ContractsUrlState): ContractListParams => ({
  ...filtersToApi(state.filters),
  status: state.status,
  page: state.page,
  per_page: state.perPage,
});

export const summaryParams = (state: ContractsUrlState): ContractSummaryParams => ({
  ...filtersToApi(state.filters),
  status: state.status,
  year: state.year === "all" ? "" : state.year,
});

/** Excel eksport — joriy filtrlar (sahifalashsiz). */
export const exportParams = (state: ContractsUrlState): ContractFilters => ({
  ...filtersToApi(state.filters),
  status: state.status,
});

export type ContractsViewMode = "table" | "grid";
export const VIEW_MODE_STORAGE_KEY = "billing.contracts.view";

export const readViewMode = (): ContractsViewMode => {
  try {
    const v = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return v === "grid" ? "grid" : "table";
  } catch {
    return "table";
  }
};

export const storeViewMode = (mode: ContractsViewMode) => {
  try {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // localStorage mavjud bo'lmasa (private rejim) — e'tiborsiz
  }
};
