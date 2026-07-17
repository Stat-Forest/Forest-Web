
"use client";

import home_default from "@/assets/sidebar_icons/home_default.svg";
import reference_default from "@/assets/sidebar_icons/mingcute_certificate-fill_default.svg";
import support_default from "@/assets/sidebar_icons/carbon_help_defaultsvg.svg";
import home_active from "@/assets/sidebar_icons/home_active.svg";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";

export function useSidebarMenu() {
  const { t } = useTranslation();
  const role = useSelector((state: RootState) => state.auth.user?.role);

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
    };
  }

  const sidebar_menu = [
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

  const sidebar_3 = [
    [
      {
        id: 10,
        name: t("item_10"),
        path: "/receipt-information",
        active_icon: "",
        default_icon: reference_default,
        arrow_icon: "",
      },
      {
        id: 11,
        name: t("item_11"),
        path: "/support-information",
        active_icon: "",
        default_icon: support_default,
        arrow_icon: "",
      },
    ],
  ];

  return { sidebar_menu, sidebar_3 };
}