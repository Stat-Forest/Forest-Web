"use client";

import { createElement, useMemo, type ReactNode } from "react";
import { MapPinned, Sprout } from "lucide-react";
import home_default from "@/assets/sidebar_icons/home_default.svg";
import reference_default from "@/assets/sidebar_icons/mingcute_certificate-fill_default.svg";
import support_default from "@/assets/sidebar_icons/carbon_help_defaultsvg.svg";
import home_active from "@/assets/sidebar_icons/home_active.svg";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { BILLING_ROUTES, BILLING_SIDEBAR_GROUP_ID } from "@/features/billing/constants";
import { isBillingRole } from "@/features/billing/permissions";
import { YASHIL_ROUTES, YASHIL_SIDEBAR_GROUP_ID } from "@/features/yashil/constants";
import { isYashilRole, useYashilAccess } from "@/features/yashil/permissions";
import { useYashilT } from "@/features/yashil/i18n";

export interface SidebarMenuItem {
  id: string | number;
  name: string;
  /** To'g'ridan-to'g'ri marshrut (bo'lsa NavLink shu yerga olib boradi). */
  path?: string;
  active_icon?: string;
  default_icon?: string;
  arrow_icon?: string;
  /** Backend'dan kelgan rasm ikonka (statements parent). */
  icon?: string;
  /** Lucide va boshqa React ikonkalar uchun. */
  iconNode?: ReactNode;
  children?: SidebarMenuItem[];
}

// "O'rmon kadastri va monitoringi" nomini turli apostroflar (‘ ’ ʻ ʼ ' `)
// va bo'sh joylardan qat'i nazar tanish uchun normalizatsiya.
export const normalizeMenuName = (name: unknown): string =>
  String(name ?? "")
    .toLowerCase()
    .replace(/[‘’ʻʼ'`´]/g, "")
    .replace(/\s+/g, "");

export const isKadastrParentName = (name: unknown): boolean => {
  const n = normalizeMenuName(name);
  if (!n) return false;
  return (
    n.includes("ormonkadastr") ||
    n.includes("урмонкадастр") ||
    (n.includes("лесн") && n.includes("кадастр"))
  );
};

/** Statements ro'yxatidan "O'rmon kadastri va monitoringi" parent'ini topadi. */
export const findKadastrParent = <T extends { id?: string | number; name?: string }>(
  sidebarData: T[] | undefined | null,
): T | undefined => (sidebarData || []).find((parent) => isKadastrParentName(parent?.name));

/**
 * `billingGroup`ni kadastr parent'ining children oxiriga (yangi obyektlar bilan,
 * RTK cache mutatsiya qilinmaydi) qo'shadi; parent topilmasa — alohida
 * top-level element sifatida oxiriga qo'shadi.
 */
export const withBillingGroup = (
  sidebarData: SidebarMenuItem[] | undefined | null,
  billingGroup: SidebarMenuItem,
): SidebarMenuItem[] => {
  const data = sidebarData || [];
  const parent = findKadastrParent(data);
  if (!parent) return [...data, billingGroup];
  return data.map((item) =>
    item === parent
      ? { ...item, children: [...(item.children || []), billingGroup] }
      : item,
  );
};

export function useBillingSidebarGroup(): SidebarMenuItem {
  const { t } = useTranslation();
  return useMemo<SidebarMenuItem>(
    () => ({
      id: BILLING_SIDEBAR_GROUP_ID,
      name: t("ijara_billing"),
      iconNode: createElement(MapPinned, { size: 18 }),
      children: [
        { id: "gis", name: t("billing_gis"), path: BILLING_ROUTES.gis },
        { id: "contracts", name: t("billing_contracts"), path: BILLING_ROUTES.contracts },
      ],
    }),
    [t],
  );
}

/** «Яшил маҳалла» — top-level guruh (TZ §16.1); nomlar modul yozuvida (kirill/lotin). */
export function useYashilSidebarGroup(): SidebarMenuItem {
  const { t } = useYashilT();
  const { cabinet, me } = useYashilAccess();
  const memberType = cabinet?.member_type;
  const showWarehouse = memberType === "supplier" || memberType === "observer" || (!!me?.is_admin && !memberType);
  return useMemo<SidebarMenuItem>(
    () => ({
      id: YASHIL_SIDEBAR_GROUP_ID,
      name: t("module_title"),
      iconNode: createElement(Sprout, { size: 18 }),
      children: [
        { id: "yashil-overview", name: t("nav_overview"), path: YASHIL_ROUTES.root },
        { id: "yashil-orders", name: t("nav_orders"), path: YASHIL_ROUTES.orders },
        { id: "yashil-acts", name: t("nav_acts"), path: YASHIL_ROUTES.acts },
        ...(showWarehouse ? [{ id: "yashil-warehouse", name: t("nav_warehouse"), path: YASHIL_ROUTES.warehouse }] : []),
        { id: "yashil-reference", name: t("nav_reference"), path: YASHIL_ROUTES.reference },
      ],
    }),
    [t, showWarehouse],
  );
}

export interface SidebarMenuResult {
  sidebar_menu: SidebarMenuItem[][];
  sidebar_3: SidebarMenuItem[][];
  billingGroup: SidebarMenuItem;
  isBillingUser: boolean;
  yashilGroup: SidebarMenuItem;
  /** ym_* rollari: faqat «Яшил маҳалла» va Yordam. */
  isYashilUser: boolean;
  /** Boshqa rollar uchun ham guruh ko'rinadi — a'zolik yoki modul admini bo'lsa. */
  hasYashilAccess: boolean;
}

export function useSidebarMenu(): SidebarMenuResult {
  const { t } = useTranslation();
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const billingGroup = useBillingSidebarGroup();
  const yashilGroup = useYashilSidebarGroup();
  const { hasAccess: hasYashilAccess } = useYashilAccess();
  const yashil = { yashilGroup, isYashilUser: isYashilRole(role), hasYashilAccess };

  if (role === "support_admin") {
    return {
      sidebar_menu: [
        [
          {
            id: 100,
            name: t("support_panel"),
            path: "/support",
            active_icon: "",
            default_icon: support_default,
            arrow_icon: "",
          },
        ],
      ],
      sidebar_3: [],
      billingGroup,
      isBillingUser: false,
      ...yashil,
    };
  }

  const helpItem: SidebarMenuItem = {
    id: 11,
    name: t("item_11"),
    path: "/support-information",
    active_icon: "",
    default_icon: support_default,
    arrow_icon: "",
  };

  // billing_user / billing_super: "Asosiy" yo'q — Sidebar statements'dan faqat
  // kadastr parent'ini (+ Ijara billing guruhi) va Yordamni ko'rsatadi.
  if (isBillingRole(role)) {
    return {
      sidebar_menu: [],
      sidebar_3: [[helpItem]],
      billingGroup,
      isBillingUser: true,
      ...yashil,
    };
  }

  // ym_* rollari: stat menyusi yo'q — faqat «Яшил маҳалла» guruhi va Yordam.
  if (yashil.isYashilUser) {
    return { sidebar_menu: [], sidebar_3: [[helpItem]], billingGroup, isBillingUser: false, ...yashil };
  }

  const sidebar_menu: SidebarMenuItem[][] = [
    [
      {
        id: 1,
        name: t("item_8"),
        path: "/main",
        active_icon: home_active,
        default_icon: home_default,
        arrow_icon: "",
      },
    ],
  ];

  const sidebar_3: SidebarMenuItem[][] = [
    [
      {
        id: 10,
        name: t("item_10"),
        path: "/receipt-information",
        active_icon: "",
        default_icon: reference_default,
        arrow_icon: "",
      },
      helpItem,
    ],
  ];

  return { sidebar_menu, sidebar_3, billingGroup, isBillingUser: false, ...yashil };
}
