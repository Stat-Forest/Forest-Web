import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import logo from "../../assets/logo.png";
import { FileText, User2 } from "lucide-react";
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
import { useSidebarMenu } from "@/services/sidebarMenu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

function Sidebar() {
  const { t } = useTranslation();
  const { sidebar_menu, sidebar_3 } = useSidebarMenu();
  const location = useLocation();
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const isSupportAdmin = userRole === "support_admin";

  const user_id = useSelector((state: RootState) => state.auth.user?.user_id);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const lang = useSelector((state: RootState) => state.language.lang);
  const [openSheetId, setOpenSheetId] = useState<string | null>(null);

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
  } = useGetStatementsReportQuery(isSupportAdmin ? skipToken : { lang });

  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useGetUsersReportQuery(
    isSupportAdmin || !user_id
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

  if (!isSupportAdmin && (sidebarLoading || userLoading)) {
    return (
      <div className="w-[320px] h-screen flex justify-center items-center bg-[#ffffff] dark:bg-gray-900">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t("loading")}...</h2>
      </div>
    );
  }

  if (!isSupportAdmin && (sidebarError || userError)) {
    return (
      <div className="w-[320px] h-screen flex justify-center items-center bg-[#ffffff] dark:bg-gray-900">
        <h2 className="text-lg font-bold text-red-500">{t("error")}</h2>
      </div>
    );
  }

  const renderNavItem = (item: any) => {
    const isParentActive =
      item.children?.some((child: any) =>
        location.pathname.includes(`/resource-management/${child.id}/`),
      ) || false;

    if (item.children?.length > 0) {
      return (
        <Sheet
          key={item.id}
          open={openSheetId === item.id}
          onOpenChange={(open) => setOpenSheetId(open ? item.id : null)}
        >
          <SheetTrigger asChild>
            <div
              onClick={() => setOpenSheetId(openSheetId === item.id ? null : item.id)}
              className={`sidebar-menu-item cursor-pointer p-3 rounded-lg flex items-center gap-3 border transition-all duration-200 group ${
                isParentActive
                  ? "bg-blue-100/80 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-400/50 shadow-md font-semibold"
                  : "text-gray-800 dark:text-gray-200 border-transparent hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300/40 bg-white/10 hover:bg-blue-50/40 dark:hover:bg-blue-900/20"
              }`}
            >
              {item.icon && (
                <img
                  src={
                    item.icon.startsWith("http://")
                      ? item.icon.replace("http://", "https://")
                      : item.icon
                  }
                  alt=""
                  className="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.startsWith("http://")) {
                      target.src = target.src.replace("http://", "https://");
                    }
                  }}
                />
              )}

              <span className="font-medium flex-1 dark:text-gray-200">{t(item.name)}</span>

              <div
                className={`w-1.5 h-1.5 rounded-full bg-blue-400 transition-opacity ${
                  isParentActive
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              />
            </div>
          </SheetTrigger>

          <SheetContent
            side="left"
            className="ml-[320px] bg-[#f8fafc] dark:bg-gray-900 backdrop-blur-xl min-w-[460px] sm:w-[460px] border-r border-gray-200 dark:border-gray-700 shadow-2xl z-[100]"
          >
            <SheetHeader className="bg-gradient-to-r from-blue-600/30 via-blue-500/25 to-blue-400/30 dark:from-blue-900/60 dark:via-blue-800/50 dark:to-blue-700/60 rounded-lg p-4 border border-blue-200 dark:border-blue-700/40 shadow-md mb-4">
              <SheetTitle className="text-gray-900 dark:text-gray-100 font-bold text-lg">
                {t(item.name)}
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col w-full px-4 gap-2 overflow-y-auto max-h-[calc(100vh-120px)]">
              {item.children.map((child: any, index: number) => (
                <NavLink
                  key={index}
                  to={`/resource-management/${child.id}/${encodeURIComponent(
                    child.name,
                  )}`}
                  onClick={() => setOpenSheetId(null)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 transition-all duration-200 p-3 rounded-lg border ${
                      isActive
                        ? "bg-blue-100/80 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-400/50 shadow-md font-semibold [&_svg]:text-blue-600 dark:[&_svg]:text-blue-400 [&_.indicator]:opacity-100"
                        : "text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 hover:shadow-md [&_svg]:text-blue-500 dark:[&_svg]:text-blue-400 [&_svg]:group-hover:text-blue-600 [&_.indicator]:opacity-0 [&_.indicator]:group-hover:opacity-100"
                    }`
                  }
                >
                  <FileText size={20} />
                  <h2 className="text-[14px] font-medium flex-1 dark:text-gray-200">
                    {t(child.name)}
                  </h2>
                  <div className="indicator w-2 h-2 rounded-full bg-blue-400 transition-opacity"></div>
                </NavLink>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <NavLink
        to={item.path}
        key={item.id}
        className={({ isActive }) =>
          `sidebar-menu-item p-3 rounded-lg flex items-center gap-3 border transition-all duration-200 group ${
            isActive
              ? "text-blue-800 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/40 border-blue-400/50 shadow-md font-semibold"
              : "text-gray-800 dark:text-gray-200 border-transparent hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300/40 bg-white/10 hover:bg-blue-50/40 dark:hover:bg-blue-900/20"
          }`
        }
      >
        {item.default_icon && (
          <img
            src={item.default_icon}
            alt=""
            className="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
          />
        )}
        <span className="font-medium flex-1 dark:text-gray-200">{t(item.name)}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </NavLink>
    );
  };

  return (
    <div className="w-[320px] h-screen overflow-y-auto p-4 bg-[#ffffff] dark:bg-gray-900 sidebar-gradient flex flex-col justify-between backdrop-blur-xl border-r border-gray-200 dark:border-gray-700 shadow-2xl transition-colors duration-300">
      <div>
        <Link
          to="/main"
          className="w-full h-[50px] rounded-full flex items-center justify-center text-white mb-3 gap-3 bg-gradient-to-r from-blue-600/80 to-blue-500/80 dark:from-blue-800/90 dark:to-blue-700/90 backdrop-blur-sm shadow-lg border border-white/20 dark:border-blue-600/30 hover:opacity-90 hover:scale-[1.02] transition-all cursor-pointer"
        >
          <img
            width={40}
            height={40}
            src={logo}
            alt="logo"
            className="drop-shadow-lg"
          />
          <h2 className="font-extrabold text-[20px] drop-shadow-md">
            STAT-URMON
          </h2>
        </Link>

        <div className="bg-gradient-to-br from-blue-600/90 via-blue-500/85 to-blue-400/90 dark:from-blue-900/90 dark:via-blue-800/85 dark:to-blue-700/90 w-full rounded-2xl p-4 flex justify-center flex-col gap-0.5 shadow-xl border border-white/30 dark:border-blue-600/20 backdrop-blur-sm">
          <div className="mb-2 flex gap-2">
            <div className="bg-white/30 backdrop-blur-md h-[50px] w-[50px] flex items-center justify-center rounded-3xl shadow-lg border border-white/40">
              <User2 className="text-white drop-shadow-md" size={24} />
            </div>
            <h3 className="font-bold text-white text-lg drop-shadow-md">
              {isSupportAdmin ? (
                <>
                  {authUser?.full_name || authUser?.email || ""}
                </>
              ) : (
                <>
                  {user?.results[0]?.first_name || ""} <br />
                  {user?.results[0]?.last_name || ""}
                </>
              )}
            </h3>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-left">
              <h3 className="font-bold text-white text-[18px] drop-shadow-sm">
                {isSupportAdmin
                  ? t("roles.support_admin")
                  : user?.results[0]?.role_display || ""}
              </h3>
            </div>

            <hr className="border-white" />

            {!isSupportAdmin && user?.results[0]?.organization_name && (
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-[16px] drop-shadow-sm">
                  {user?.results[0]?.organization_name || ""}
                </h3>
              </div>
            )}

            {user?.results[0]?.role === "hududiy_boshqarma" && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem className="text-white" value="organizations">
                  <AccordionTrigger className="text-lg font-bold [&>svg]:text-white [&>svg]:text-3xl cursor-pointer">
                    {user?.results[0]?.region_display}
                  </AccordionTrigger>

                  <AccordionContent>
                    <ul className="space-y-2">
                      {user?.results[0]?.region_user_orgs?.map((org: any) => (
                        <li
                          key={org}
                          className="border rounded-md px-3 py-2 text-sm"
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

        <nav className="mt-4 flex flex-col gap-2">
          {[...sidebar_menu, ...(sidebarData || []), ...sidebar_3]
            .flat()
            .map(renderNavItem)}
        </nav>
      </div>
    </div>
  );
}

export default Sidebar;
