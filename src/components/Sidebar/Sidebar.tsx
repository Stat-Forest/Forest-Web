import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import logo from "../../assets/logo.png";
import { FileText, User2, Search, X, Landmark } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useGetStatementsReportQuery,
  useGetUsersReportQuery,
} from "@/services/reportsApi";
import { useTranslation } from "react-i18next";
import { RootState } from "@/app/store";
import { useSelector } from "react-redux";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  findKadastrParent,
  useSidebarMenu,
  withBillingGroup,
  type SidebarMenuItem,
} from "@/services/sidebarMenu";
import { BILLING_ROUTES } from "@/features/billing/constants";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

const matchesQuery = (
  t: (key: string) => string,
  name: string | undefined,
  query: string,
) => {
  const translatedName = String(t(name || "") || name || "").toLowerCase();
  const rawName = String(name || "").toLowerCase();
  return translatedName.includes(query) || rawName.includes(query);
};

const childPathActive = (pathname: string, child: SidebarMenuItem): boolean => {
  if (child.path && pathname.startsWith(child.path)) return true;
  if (pathname.includes(`/resource-management/${child.id}/`)) return true;
  return (child.children || []).some((g) => childPathActive(pathname, g));
};

function Sidebar() {
  const { t, i18n } = useTranslation();
  const { sidebar_menu, sidebar_3, billingGroup, isBillingUser } = useSidebarMenu();
  const location = useLocation();
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const isSupportAdmin = userRole === "support_admin";
  // support_admin uchun statements/users so'rovlari kerak emas. Billing rollari
  // (billing_user/billing_super) uchun backend statements'dan faqat kadastr
  // parent'ini, users'dan esa faqat o'zini qaytaradi.
  const skipUserQueries = isSupportAdmin;

  const user_id = useSelector((state: RootState) => state.auth.user?.user_id);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const lang = useSelector((state: RootState) => state.language.lang);
  const [openSheetId, setOpenSheetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    setSearchQuery("");
  }, [openSheetId]);

  useEffect(() => {
    const handleOpenSubmenu = (e: CustomEvent<{ parentId?: string; id?: string }>) => {
      const pId = e.detail?.parentId || e.detail?.id;
      if (pId) {
        setOpenSheetId(pId);
      }
    };
    window.addEventListener("open-sidebar-submenu", handleOpenSubmenu as EventListener);
    return () => window.removeEventListener("open-sidebar-submenu", handleOpenSubmenu as EventListener);
  }, []);

  const {
    data: sidebarData = [],
    isLoading: sidebarLoading,
    error: sidebarError,
  } = useGetStatementsReportQuery(skipUserQueries ? skipToken : { lang });

  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useGetUsersReportQuery(
    skipUserQueries || !user_id
      ? skipToken
      : {
          user_id: String(user_id),
          page: "",
          perPage: 10,
          search: "",
          organization: "",
          role: "",
        },
  );

  // "Ijara billing" guruhi "O'rmon kadastri va monitoringi" parent'ining oxirgi
  // bolasi (RTK cache mutatsiya qilinmaydi — yangi obyektlar yasaladi).
  // Billing rollari: faqat kadastr parent (+ Ijara billing) va Yordam;
  // statements xato bersa ham Ijara billing guruhi top-level ko'rinadi.
  const menuItems = useMemo<SidebarMenuItem[]>(() => {
    if (isSupportAdmin) return [...sidebar_menu, ...sidebar_3].flat();
    if (isBillingUser) {
      const parent = sidebarError
        ? undefined
        : findKadastrParent(sidebarData as SidebarMenuItem[]);
      return [...withBillingGroup(parent ? [parent] : [], billingGroup), ...sidebar_3.flat()];
    }
    return [
      ...sidebar_menu.flat(),
      ...withBillingGroup(sidebarData as SidebarMenuItem[], billingGroup),
      ...sidebar_3.flat(),
    ];
  }, [isSupportAdmin, isBillingUser, sidebar_menu, sidebar_3, sidebarData, sidebarError, billingGroup]);

  if (!skipUserQueries && (sidebarLoading || userLoading)) {
    return (
      <div className="w-[320px] h-screen flex justify-center items-center bg-[#ffffff] dark:bg-gray-900">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t("loading")}...</h2>
      </div>
    );
  }

  // Billing rollari uchun xato butun sidebar'ni to'smaydi (yuqoridagi fallback).
  if (!skipUserQueries && !isBillingUser && (sidebarError || userError)) {
    return (
      <div className="w-[320px] h-screen flex justify-center items-center bg-[#ffffff] dark:bg-gray-900">
        <h2 className="text-lg font-bold text-red-500">{t("error")}</h2>
      </div>
    );
  }

  const renderIconBox = (active: boolean, content: ReactNode) => (
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
        active
          ? "bg-white/20 text-white"
          : "bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
      }`}
    >
      {content}
    </div>
  );

  const sheetLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3.5 transition-all duration-200 p-3.5 rounded-xl border font-sans ${
      isActive
        ? "bg-gradient-to-r from-blue-600 to-indigo-600 !text-white border-transparent shadow-md shadow-blue-500/25 font-semibold [&_svg]:text-white [&_.indicator]:opacity-100"
        : "text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800/80 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300/80 shadow-xs [&_svg]:text-blue-500 dark:[&_svg]:text-blue-400 [&_.indicator]:opacity-0 [&_.indicator]:group-hover:opacity-100"
    }`;

  const renderSheetLink = (child: SidebarMenuItem, key: string | number) => (
    <NavLink
      key={key}
      to={
        child.path ||
        `/resource-management/${child.id}/${encodeURIComponent(child.name)}`
      }
      onClick={() => setOpenSheetId(null)}
      className={sheetLinkClass}
    >
      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 flex items-center justify-center shrink-0 transition-colors group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50">
        <FileText size={18} className="transition-transform group-hover:scale-110" />
      </div>
      <span className="text-sm font-medium flex-1 leading-snug transition-transform duration-200 origin-left group-hover:scale-105 group-hover:font-semibold">
        {t(child.name)}
      </span>
      <div className="indicator w-2 h-2 rounded-full bg-emerald-400 transition-opacity shrink-0"></div>
    </NavLink>
  );

  // Sheet ichidagi ichki guruh (masalan "Ijara billing") — Accordion, ichida
  // grandchild NavLink'lar.
  const renderSheetGroup = (child: SidebarMenuItem, grandchildren: SidebarMenuItem[], key: string | number) => {
    const groupActive = childPathActive(location.pathname, child);
    return (
      <Accordion
        key={key}
        type="single"
        collapsible
        defaultValue={groupActive || searchQuery.trim() ? String(child.id) : undefined}
        className="w-full"
      >
        <AccordionItem
          value={String(child.id)}
          className={`rounded-xl border bg-white dark:bg-slate-900 shadow-xs px-3.5 ${
            groupActive
              ? "border-blue-300 dark:border-blue-700"
              : "border-slate-200/80 dark:border-slate-800"
          }`}
        >
          <AccordionTrigger className="py-3 hover:no-underline cursor-pointer [&>svg]:text-slate-400">
            <div className="flex items-center gap-3.5 flex-1 text-left">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  groupActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    : "bg-blue-50 dark:bg-slate-800 text-blue-500 dark:text-blue-400"
                }`}
              >
                {child.iconNode ?? <Landmark size={18} />}
              </div>
              <span
                className={`text-sm font-semibold leading-snug ${
                  groupActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {t(child.name)}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="flex flex-col gap-2 pl-1">
              {grandchildren.map((g, gi) => renderSheetLink(g, `${child.id}-${g.id}-${gi}`))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  const renderNavItem = (item: SidebarMenuItem) => {
    const isParentActive =
      item.children?.some((child) => childPathActive(location.pathname, child)) || false;

    if (item.children && item.children.length > 0) {
      const query = searchQuery.trim().toLowerCase();
      // Qidiruv: bolalar va ichki guruhlarning nevaralari ham ko'riladi
      const filteredChildren = item.children
        .map((child) => {
          if (!query) return child;
          if (matchesQuery(t, child.name, query)) return child;
          if (child.children?.length) {
            const grandchildren = child.children.filter((g) => matchesQuery(t, g.name, query));
            return grandchildren.length ? { ...child, children: grandchildren } : null;
          }
          return null;
        })
        .filter((c): c is SidebarMenuItem => c !== null);

      return (
        <Sheet
          key={item.id}
          open={openSheetId === String(item.id)}
          onOpenChange={(open) => setOpenSheetId(open ? String(item.id) : null)}
        >
          <SheetTrigger asChild>
            <div
              onClick={() => setOpenSheetId(openSheetId === String(item.id) ? null : String(item.id))}
              className={`sidebar-menu-item cursor-pointer px-3.5 py-3 rounded-xl flex items-center gap-3 border transition-all duration-200 group font-sans ${
                isParentActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 !text-white border-transparent shadow-md shadow-blue-500/25 font-semibold"
                  : "text-slate-700 dark:text-slate-200 border-transparent hover:bg-blue-50/80 dark:hover:bg-slate-800/80 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
              }`}
            >
              {item.iconNode
                ? renderIconBox(
                    isParentActive,
                    <span className="transition-transform duration-200 group-hover:scale-110 flex">
                      {item.iconNode}
                    </span>,
                  )
                : item.icon && (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isParentActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40"
                    }`}>
                      <img
                        src={
                          item.icon.startsWith("http://")
                            ? item.icon.replace("http://", "https://")
                            : item.icon
                        }
                        alt=""
                        className={`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110 ${
                          isParentActive ? "brightness-0 invert" : ""
                        }`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.startsWith("http://")) {
                            target.src = target.src.replace("http://", "https://");
                          }
                        }}
                      />
                    </div>
                  )}

              <span className={`text-sm font-medium flex-1 leading-tight transition-transform duration-200 origin-left group-hover:scale-105 group-hover:font-semibold ${isParentActive ? "!text-white" : ""}`}>{t(item.name)}</span>

              <div
                className={`w-2 h-2 rounded-full transition-all ${
                  isParentActive
                    ? "bg-emerald-400 opacity-100 shadow-xs"
                    : "bg-blue-500 opacity-0 group-hover:opacity-100"
                }`}
              />
            </div>
          </SheetTrigger>

          <SheetContent
            side="left"
            className="ml-[320px] bg-slate-50/98 dark:bg-slate-950/98 backdrop-blur-xl min-w-[440px] sm:w-[440px] border-r border-slate-200 dark:border-slate-800 shadow-2xl z-[100] font-sans p-6"
          >
            <SheetHeader className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 rounded-2xl p-5 border border-white/20 dark:border-slate-800 shadow-lg mb-4 text-white pr-14 relative">
              <SheetTitle className="text-white font-bold text-base leading-snug tracking-tight font-sans text-left pr-2">
                {t(item.name)}
              </SheetTitle>
              <p className="text-xs font-medium text-blue-100 dark:text-slate-300 mt-1 font-sans text-left">
                {i18n.language === "ru" ? "Доступные разделы и отчеты" : "Mavjud bo'limlar va hisobotlar"}
              </p>
            </SheetHeader>

            <div className="relative mb-3.5">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={i18n.language === "ru" ? "Поиск разделов..." : "Bo'limlarni qidirish..."}
                className="w-full h-11 pl-10 pr-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-xs transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-col w-full gap-2.5 overflow-y-auto max-h-[calc(100vh-210px)] pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full">
              {filteredChildren.length === 0 ? (
                <div className="py-8 text-center text-sm font-medium text-slate-400 dark:text-slate-500">
                  {i18n.language === "ru" ? "Ничего не найдено" : "Bo'limlar topilmadi"}
                </div>
              ) : (
                filteredChildren.map((child, index) =>
                  child.children && child.children.length > 0
                    ? renderSheetGroup(child, child.children, `${child.id}-${index}-${query}`)
                    : renderSheetLink(child, index),
                )
              )}
            </div>
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <NavLink
        to={item.path || "/main"}
        key={item.id}
        className={({ isActive }) =>
          `sidebar-menu-item px-3.5 py-3 rounded-xl flex items-center gap-3 border transition-all duration-200 group font-sans ${
            isActive
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 !text-white border-transparent shadow-md shadow-blue-500/25 font-semibold hover:from-blue-600 hover:to-indigo-600 hover:!text-white"
              : "text-slate-700 dark:text-slate-200 border-transparent hover:bg-blue-50/80 dark:hover:bg-slate-800/80 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
          }`
        }
      >
        {({ isActive }) => (
          <>
            {item.iconNode
              ? renderIconBox(
                  isActive,
                  <span className="transition-transform duration-200 group-hover:scale-110 flex">
                    {item.iconNode}
                  </span>,
                )
              : item.default_icon && (
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40"
                  }`}>
                    <img
                      src={item.default_icon}
                      alt=""
                      className={`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? "brightness-0 invert" : ""
                      }`}
                    />
                  </div>
                )}
            <span className={`text-sm font-medium flex-1 leading-tight transition-transform duration-200 origin-left group-hover:scale-105 group-hover:font-semibold ${isActive ? "!text-white" : ""}`}>{t(item.name)}</span>
            <div className={`w-2 h-2 rounded-full transition-all ${
              isActive ? "bg-emerald-400 opacity-100 shadow-xs" : "bg-blue-500 opacity-0 group-hover:opacity-100"
            }`}></div>
          </>
        )}
      </NavLink>
    );
  };

  const profileUser = userError ? undefined : user?.results[0];
  const profileName =
    skipUserQueries || (isBillingUser && !profileUser)
      ? authUser?.full_name || authUser?.email || ""
      : `${profileUser?.first_name || ""} ${profileUser?.last_name || ""}`;

  const profileRole = isSupportAdmin
    ? t("roles.support_admin")
    : isBillingUser
      ? t(`roles.${userRole}`)
      : user?.results[0]?.role &&
          t(`roles.${user.results[0].role}`) !== `roles.${user.results[0].role}`
        ? t(`roles.${user.results[0].role}`)
        : user?.results[0]?.role_display || "";

  return (
    <div className="w-[320px] h-screen overflow-y-auto p-4 bg-white dark:bg-slate-950 font-sans sidebar-gradient flex flex-col justify-between backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800 shadow-xl transition-colors duration-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full">
      <div>
        <Link
          to={isBillingUser ? BILLING_ROUTES.gis : "/main"}
          className="w-full h-[52px] rounded-2xl flex items-center justify-center text-white mb-3.5 gap-3 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 shadow-lg shadow-blue-500/20 border border-white/20 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <img
            width={36}
            height={36}
            src={logo}
            alt="logo"
            className="drop-shadow-md"
          />
          <h2 className="font-extrabold text-[19px] tracking-tight drop-shadow-sm font-sans">
            STAT-URMON
          </h2>
        </Link>

        <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 w-full rounded-2xl p-4 flex flex-col gap-3 shadow-xl border border-white/20 dark:border-slate-800 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="bg-white/20 backdrop-blur-md h-[48px] w-[48px] flex items-center justify-center rounded-xl shadow-inner border border-white/30 shrink-0 mt-0.5">
              <User2 className="text-white drop-shadow-xs" size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-white text-base leading-snug truncate drop-shadow-xs font-sans">
                {profileName}
              </h3>
              <div className="mt-1.5 flex flex-wrap">
                <span className="inline-flex items-center bg-white/25 dark:bg-blue-600/40 backdrop-blur-md text-white text-sm font-bold px-3.5 py-1 rounded-xl border border-white/35 dark:border-blue-400/40 shadow-xs tracking-wide">
                  {profileRole}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {!skipUserQueries && profileUser?.organization_name && (
              <>
                <div className="h-px bg-white/20 w-full my-0.5" />
                <p className="text-xs font-medium text-blue-50/90 dark:text-slate-300 leading-relaxed font-sans line-clamp-2">
                  {i18n.language === "ru" &&
                  (user?.results[0]?.organization_name === "O'rmon xo'jaligini raqamlashtirish markazi davlat muassasasi" ||
                    !user?.results[0]?.organization_name)
                    ? t("compny_name")
                    : user?.results[0]?.organization_name || ""}
                </p>
              </>
            )}

            {user?.results[0]?.role === "hududiy_boshqarma" && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem className="text-white border-b-0" value="organizations">
                  <AccordionTrigger className="text-sm font-bold text-white py-2 [&>svg]:text-white cursor-pointer">
                    {user?.results[0]?.region_display}
                  </AccordionTrigger>

                  <AccordionContent>
                    <ul className="space-y-1.5">
                      {user?.results[0]?.region_user_orgs?.map((org: string) => (
                        <li
                          key={org}
                          className="bg-white/10 rounded-lg px-3 py-1.5 text-xs text-white/90 border border-white/15"
                        >
                          {org}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-1.5">
          {menuItems.map(renderNavItem)}
        </nav>
      </div>
    </div>
  );
}

export default Sidebar;
