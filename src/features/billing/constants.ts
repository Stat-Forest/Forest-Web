import type { ContractStatus } from "./types";

export const CONTRACT_STATUS: Record<"ACTIVE" | "INACTIVE", ContractStatus> = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

/** i18n kalitlari (`billing.status_active` / `billing.status_inactive`). */
export const CONTRACT_STATUS_LABEL_KEY: Record<ContractStatus, string> = {
  active: "billing.status_active",
  inactive: "billing.status_inactive",
};

/** Xarita pinlari / poligonlari rangi (billing bilan bir xil). */
export const CONTRACT_STATUS_COLOR: Record<ContractStatus, string> = {
  active: "#4caf50",
  inactive: "#ff0000",
};
export const CONTRACT_DEFAULT_COLOR = "#0c74bb";

export const XOJALIK_COLOR = "#f59e0b";
export const KONTUR_HIGHLIGHT_COLOR = "#2563eb";

export const BILLING_YEAR_FROM = 2020;
export const BILLING_YEAR_TO = 2026;
export const YEARS: number[] = Array.from(
  { length: BILLING_YEAR_TO - BILLING_YEAR_FROM + 1 },
  (_, i) => BILLING_YEAR_FROM + i,
);

export const CONTRACTS_PER_PAGE = 20;
export const IMPORT_CHUNK_SIZE = 50;
export const IMPORT_MAX_ROWS_PER_REQUEST = 200;

/** O'zbekiston markazi — xarita boshlang'ich ko'rinishi. */
export const UZ_MAP_CENTER: [number, number] = [41.377491, 64.585262];
export const UZ_MAP_ZOOM = 6;

export const BILLING_ROUTES = {
  gis: "/billing/gis",
  contracts: "/billing/contracts",
  create: "/billing/contracts/create",
  uploadExcel: "/billing/contracts/upload-excel",
  detail: (id: string) => `/billing/contracts/${id}`,
} as const;

/** Sidebar'dagi "Ijara billing" guruhi id'si (open-sidebar-submenu uchun). */
export const BILLING_SIDEBAR_GROUP_ID = "ijara-billing";

export const BILLING_WRITER_ROLES = ["billing_user", "billing_super", "super_admin"] as const;

export const CONTRACT_FILE_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx";
export const CONTRACT_FILE_MAX_MB = 20;
