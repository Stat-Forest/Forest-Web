import { NavLink } from "react-router-dom";
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

function Sidebar() {
  const { t } = useTranslation();
  const { sidebar_menu, sidebar_3 } = useSidebarMenu();

  const user_id = useSelector((state: RootState) => state.auth.user?.user_id);
  const lang = useSelector((state: RootState) => state.language.lang);

  const {
    data: sidebarData = [],
    isLoading: sidebarLoading,
    error: sidebarError,
  } = useGetStatementsReportQuery({ lang });

  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useGetUsersReportQuery(
    user_id ? { user_id, page: "", perPage: 10 } : skipToken
  );

  if (sidebarLoading || userLoading) {
    return (
      <div className="w-[320px] h-screen flex justify-center items-center">
        <h2 className="text-lg font-bold">{t("loading")}...</h2>
      </div>
    );
  }

  if (sidebarError || userError) {
    return (
      <div className="w-[320px] h-screen flex justify-center items-center">
        <h2 className="text-lg font-bold text-red-500">{t("error")}</h2>
      </div>
    );
  }

  const renderNavItem = (item: any) => {
    if (item.children?.length > 0) {
      return (
        <Sheet key={item.id}>
          <SheetTrigger asChild>
            <div className="sidebar-menu-item cursor-pointer p-3 rounded-lg flex items-center gap-3 border transition-all duration-200 group text-gray-800 border-transparent hover:text-blue-700 hover:border-blue-300/40 bg-white/10 hover:bg-blue-50/40">
              {item.icon && (
                <img
                  src={item.icon.startsWith("http://") ? item.icon.replace("http://", "https://") : item.icon}
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
              <span className="font-medium flex-1">{t(item.name)}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="ml-[320px] bg-ice backdrop-blur-xl min-w-[460px] sm:w-[460px] border-r border-white/20 shadow-2xl z-[100]"
          >
            <SheetHeader className="bg-gradient-to-r from-blue-600/30 via-blue-500/25 to-blue-400/30 rounded-lg p-4 border border-white/30 shadow-md mb-4">
              <SheetTitle className="text-gray-900 font-bold text-lg">
                {t(item.name)}
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col w-full px-4 gap-2 overflow-y-auto max-h-[calc(100vh-120px)]">
              {item.children.map((child: any, index: number) => (
                <NavLink
                  key={index}
                  to={`/resource-management/${child.id}/${child.name}`}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 transition-all duration-200 p-3 rounded-lg border ${
                      isActive
                        ? "bg-blue-100/80 text-blue-800 border-blue-400/50 shadow-md font-semibold [&_svg]:text-blue-600 [&_.indicator]:opacity-100"
                        : "text-gray-800 bg-white/40 border-white/50 hover:bg-blue-50/70 hover:text-blue-700 hover:border-blue-300/60 hover:shadow-md [&_svg]:text-blue-500 [&_svg]:group-hover:text-blue-600 [&_.indicator]:opacity-0 [&_.indicator]:group-hover:opacity-100"
                    }`
                  }
                >
                  <FileText size={20} />
                  <h2 className="text-[14px] font-medium flex-1">{t(child.name)}</h2>
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
            ? "text-blue-800 bg-blue-100/60 border-blue-400/50 shadow-md font-semibold"
            : "text-gray-800 border-transparent hover:text-blue-700 hover:border-blue-300/40 bg-white/10 hover:bg-blue-50/40"
        }`
      }
      >
        {item.default_icon && (
          <img src={item.default_icon} alt="" className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
        )}
        <span className="font-medium flex-1">{t(item.name)}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </NavLink>
    );
  };

  return (
    <div className="w-[320px] h-screen overflow-y-auto p-4 bg-ice sidebar-gradient flex flex-col justify-between backdrop-blur-xl border-r border-white/20 shadow-2xl">
      <div>
        {/* Header */}
        <div className="w-full h-[50px] rounded-full flex items-center justify-center text-white mb-3 gap-3 bg-gradient-to-r from-blue-600/80 to-blue-500/80 backdrop-blur-sm shadow-lg border border-white/20">
          <img width={40} height={40} src={logo} alt="logo" className="drop-shadow-lg" />
          <h2 className="font-extrabold text-[20px] drop-shadow-md">STAT-URMON</h2>
        </div>

        {/* Foydalanuvchi kartochkasi */}
        <div className="bg-gradient-to-br from-blue-600/90 via-blue-500/85 to-blue-400/90 w-full rounded-2xl p-4 flex justify-center flex-col gap-0.5 shadow-xl border border-white/30 backdrop-blur-sm">
          <div className="mb-2 flex gap-2">
            <div className="bg-white/30 backdrop-blur-md h-[50px] w-[50px] flex items-center justify-center rounded-3xl shadow-lg border border-white/40">
              <User2 className="text-white drop-shadow-md" size={24} />
            </div>
             <h3 className="font-bold text-white text-lg drop-shadow-md">
              {user?.results[0]?.first_name || ""} <br />
              {user?.results[0]?.last_name || ""}
            </h3>
          </div>
          <div className="flex flex-col gap-2">

            <div className="flex items-center gap-2 text-left">
              {/* <span className="text-[white] text-[16px] font-light">
                {t("user_role")}: 
              </span> */}
              <h3 className="font-bold text-white text-[18px] drop-shadow-sm">
                {user?.results[0]?.role || ""}
              </h3>
            </div>
            <hr className="border-white/30" />
            {/* <div className="flex items-center gap-2 text-left">
              <span className="text-[white] text-[16px] font-light">
                {t("item_78")}:
              </span>
              <h3 className="font-bold text-white text-[18px]">
                {user?.results[0]?.user_number || ""}
              </h3>
            </div> */}
            {user?.results[0]?.organization_name && (
              <div className="flex items-center gap-2">
                {/* <span className="text-[white] text-[16px] font-light">
                  {t("item_12")}:
                </span> */}
                <h3 className="font-bold text-white text-[16px] drop-shadow-sm">
                  {user?.results[0]?.organization_name || ""}
                </h3>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar menyulari */}
        <nav className="mt-4 flex flex-col gap-2">
          {[...sidebar_menu, ...(sidebarData.results || []), ...sidebar_3]
            .flat()
            .map(renderNavItem)}
        </nav>
      </div>
    </div>
  );
}

export default Sidebar;
