/** «Яшил маҳалла» moduli: marshrutlar, rollar, sozlamalar. */

export const YASHIL_ROUTES = {
  root: "/yashil",
  reference: "/yashil/reference",
} as const;

/** Sidebar'dagi top-level guruh id'si (open-sidebar-submenu uchun). */
export const YASHIL_SIDEBAR_GROUP_ID = "yashil-mahalla";

/** Faqat shu modulni ko'radigan rollar (backend role_access allow-list bilan bir xil). */
export const YASHIL_ROLES = ["ym_mahalla", "ym_union", "ym_dm", "ym_observer"] as const;

/** Faol kabinet header'i (backend `CABINET_HEADER`). */
export const CABINET_HEADER = "X-Yashil-Cabinet";

/** Tanlangan kabinet va yozuv (kirill/lotin) cookie'lari. */
export const CABINET_COOKIE = "yashil_cabinet";
export const SCRIPT_COOKIE = "yashil_script";

export const YASHIL_ALLOWED_PREFIXES = ["/yashil", "/support-information", "/video"];
