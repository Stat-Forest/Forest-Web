import home_default from "@/assets/sidebar_icons/home_default.svg";
import analitics_default from "@/assets/sidebar_icons/analytics_default.svg";
import development_default from "@/assets/sidebar_icons/hugeicons_green-house_default.svg";
import reference_default from "@/assets/sidebar_icons/mingcute_certificate-fill_default.svg";
import support_default from "@/assets/sidebar_icons/carbon_help_defaultsvg.svg";

import home_active from "@/assets/sidebar_icons/home_active.svg";

export const sidebar_menu = [
  [
    {
      id: 1,
      name: "Bosh sahifa",
      path: "/main",
      active_icon: home_active,
      default_icon: home_default,
      arrow_icon: "",
    },
    {
      id: 2,
      name: "Axborot-tahlil, ijro intizomi",
      path: "/home",
      active_icon: "",
      default_icon: analitics_default,
      arrow_icon: "",
    },
  ],
];
export const sidebar_3 = [
  [
    {
      id: 9,
      name: "Yangi hisobot",
      path: "/home",
      active_icon: "",
      default_icon: development_default,
      arrow_icon: "",
    },
    {
      id: 10,
      name: "Malumotnoma olish",
      path: "/receipt-information",
      active_icon: "",
      default_icon: reference_default,
      arrow_icon: "",
    },
    {
      id: 11,
      name: "Yordam va ma'lumot",
      path: "/support-information",
      active_icon: "",
      default_icon: support_default,
      arrow_icon: "",
    },
  ],
];
