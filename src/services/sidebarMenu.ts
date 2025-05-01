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
// export const sidebar_2 = [
//   {
//     id: "00927471-7310-4c34-b287-39ace571739d",
//     name: "Inson resurslarini boshqarish",
//     period: null,
//     parent: null,
//     children: [
//       {
//         id: "8c34621d-d05b-4fd0-b652-12df40c775b1",
//         name: "Hodimlar hisobi",
//       },
//     ],
//   },
//   {
//     id: "e160b8b4-5fef-4b31-bcdd-997256095fa8",
//     name: "Moliya-iqsisod va bugaltiriya",
//     period: null,
//     parent: null,
//     children: [],
//   },
//   {
//     id: "42bafb96-d416-484d-b5f9-37e7d19f4efe",
//     name: "Urmon barpo qilish",
//     period: null,
//     parent: null,
//     children: [],
//   },
//   {
//     id: "36f69a31-ef90-4792-941f-36f7f2fd12d9",
//     name: "Urmon kadestri-ijoara",
//     period: null,
//     parent: null,
//     children: [],
//   },
//   {
//     id: "3e9b68e3-0451-4020-a419-cfa5d21eeb3b",
//     name: "Urmonlardan qoshimcha foydalanish",
//     period: null,
//     parent: null,
//     children: [],
//   },
//   {
//     id: "47973cbc-a007-448c-a2d9-3ee8930a4845",
//     name: "Urmonlarni muhofaza qilish",
//     period: null,
//     parent: null,
//     children: [],
//   },
// ];

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
      name: "Sozlamalar",
      path: "/home",
      active_icon: "",
      default_icon: reference_default,
      arrow_icon: "",
    },
    {
      id: 11,
      name: "Yordam va ma'lumot",
      path: "/home",
      active_icon: "",
      default_icon: support_default,
      arrow_icon: "",
    },
  ],
];
