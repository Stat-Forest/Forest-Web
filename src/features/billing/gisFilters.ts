// GIS Monitoring filtr holati va uni `geo-list` so'rov parametrlariga aylantirish.
import type { ContractFilters } from "./types";
import { toApiDate } from "./format";

/** GIS filter dialogi holati (UI). */
export interface GisFilterState {
  stir: string;
  fullname: string;
  number: string;
  xojalik: string;
  /** yyyy-mm-dd (input[type=date]) */
  from_date: string;
  to_date: string;
  /** "" → backend standarti (faqat faol); "all" → barchasi */
  status: "" | "all" | "active" | "inactive";
  debtors: boolean;
}

export const EMPTY_GIS_FILTERS: GisFilterState = {
  stir: "",
  fullname: "",
  number: "",
  xojalik: "",
  from_date: "",
  to_date: "",
  status: "",
  debtors: false,
};

export const hasActiveGisFilters = (f: GisFilterState): boolean =>
  f.stir !== "" ||
  f.fullname !== "" ||
  f.number !== "" ||
  f.xojalik !== "" ||
  f.from_date !== "" ||
  f.to_date !== "" ||
  f.status !== "" ||
  f.debtors;

/** UI holati → `geo-list` so'rov parametrlari (§3.3 filtrlar). */
export const gisFiltersToApi = (f: GisFilterState): ContractFilters => ({
  stir: f.stir.trim(),
  fullname: f.fullname.trim(),
  number: f.number.trim(),
  xojalik: f.xojalik,
  from_date: toApiDate(f.from_date),
  to_date: toApiDate(f.to_date),
  status: f.status,
  debtors: f.debtors ? 1 : "",
});
