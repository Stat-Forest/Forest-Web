import home_default from "@/assets/sidebar_icons/home_default.svg";
import analitics_default from "@/assets/sidebar_icons/analytics_default.svg";
import humans_default from "@/assets/sidebar_icons/human-male-female_default.svg";
import moliya_default from "@/assets/sidebar_icons/material-symbols_finance-mode-rounded_default.svg";
import create_forest_default from "@/assets/sidebar_icons/lucide_trees_default.svg";
import kodastor_default from "@/assets/sidebar_icons/foundation_trees_defaultt.svg";
import additional_default from "@/assets/sidebar_icons/pepicons-pop_tree-circle_default.svg";
import security_default from "@/assets/sidebar_icons/icon-park-outline_protect_default.svg";
import development_default from "@/assets/sidebar_icons/hugeicons_green-house_default.svg";
import reference_default from "@/assets/sidebar_icons/mingcute_certificate-fill_default.svg";
import support_default from "@/assets/sidebar_icons/carbon_help_defaultsvg.svg";

import home_active from "@/assets/sidebar_icons/home_active.svg";

export const sidebar_menu = [
  {
    id: 1,
    title: "Bosh sahifa",
    path: "/main",
    active_icon: home_active,
    default_icon: home_default,
    arrow_icon: "",
  },
  {
    id: 2,
    title: "Axborot-tahlil, ijro intizomi",
    path: "/home",
    active_icon: "",
    default_icon: analitics_default,
    arrow_icon: "",
  },
  {
    id: 3,
    title: "Inson resurslarini boshqarish",
    path: "/home",
    active_icon: "",
    default_icon: humans_default,
    arrow_icon: "",
  },
  {
    id: 4,
    title: "Moliyа-iqtisod va buxgalte...",
    path: "/home",
    active_icon: "",
    default_icon: moliya_default,
    arrow_icon: "",
  },
  {
    id: 5,
    title: "O’rmon barpo qilish",
    path: "/home",
    active_icon: "",
    default_icon: create_forest_default,
    arrow_icon: "",
  },
  {
    id: 6,
    title: "O‘rmon kadastri, ijara",
    path: "/home",
    active_icon: "",
    default_icon: kodastor_default,
    arrow_icon: "",
  },
  {
    id: 7,
    title: "O‘rmonlarni muhofaza qilish",
    path: "/home",
    active_icon: "",
    default_icon: additional_default,
    arrow_icon: "",
  },
  {
    id: 8,
    title: "Yashil hududlarni rivojlantirish",
    path: "/home",
    active_icon: "",
    default_icon: security_default,
    arrow_icon: "",
  },
  {
    id: 9,
    title: "Yangi hisobot",
    path: "/home",
    active_icon: "",
    default_icon: development_default,
    arrow_icon: "",
  },
  {
    id: 10,
    title: "Sozlamalar",
    path: "/home",
    active_icon: "",
    default_icon: reference_default,
    arrow_icon: "",
  },
  {
    id: 11,
    title: "Yordam va ma'lumot",
    path: "/home",
    active_icon: "",
    default_icon: support_default,
    arrow_icon: "",
  },
];
