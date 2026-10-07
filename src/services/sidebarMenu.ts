"use client";

import { createElement, useMemo, type ReactNode } from "react";
import { MapPinned } from "lucide-react";
import home_default from "@/assets/sidebar_icons/home_default.svg";
import reference_default from "@/assets/sidebar_icons/mingcute_certificate-fill_default.svg";
import support_default from "@/assets/sidebar_icons/carbon_help_defaultsvg.svg";
import home_active from "@/assets/sidebar_icons/home_active.svg";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { BILLING_ROUTES, BILLING_SIDEBAR_GROUP_ID } from "@/features/billing/constants";

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

export function useSidebarMenu(): {
  sidebar_menu: SidebarMenuItem[][];
  sidebar_3: SidebarMenuItem[][];
  billingGroup: SidebarMenuItem;
  isBillingUser: boolean;
} {
  const { t } = useTranslation();
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const billingGroup = useBillingSidebarGroup();

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

  // billing_user: faqat "Ijara billing" (2 bola) + Yordam
  if (role === "billing_user") {
    return {
      sidebar_menu: [],
      sidebar_3: [[helpItem]],
      billingGroup,
      isBillingUser: true,
    };
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

  return { sidebar_menu, sidebar_3, billingGroup, isBillingUser: false };
}
