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
      <div className="w-[310px] h-screen flex justify-center items-center">
        <h2 className="text-lg font-bold">{t("loading")}...</h2>
      </div>
    );
  }

  if (sidebarError || userError) {
    return (
      <div className="w-[310px] h-screen flex justify-center items-center">
        <h2 className="text-lg font-bold text-red-500">{t("error")}</h2>
      </div>
    );
  }

  const renderNavItem = (item: any) => {
    if (item.children?.length > 0) {
      return (
        <Sheet key={item.id}>
          <SheetTrigger asChild>
            <div className="cursor-pointer p-2 hover:bg-gray-200 rounded-md flex items-center gap-2">
              {item.icon && <img src={item.icon} alt="" className="w-5 h-5" />}
              <span>{t(item.name)}</span>
            </div>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="ml-[310px] bg-white/20 text-white min-w-[460px] sm:w-[460px]"
          >
            <SheetHeader>
              <SheetTitle>{t(item.name)}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col ml-6 w-full mt-1 gap-4">
              {item.children.map((child: any, index: number) => (
                <NavLink
                  key={index}
                  to={`/resource-management/${child.id}`}
                  className="text-[white] hover:underline flex items-center gap-1"
                >
                  <FileText />
                  <h2 className="text-[17px]">{t(child.name)}</h2>
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
        className="p-2 hover:bg-gray-200 rounded-md flex items-center gap-2"
      >
        {item.default_icon && (
          <img src={item.default_icon} alt="" className="w-5 h-5" />
        )}
        <span>{t(item.name)}</span>
      </NavLink>
    );
  };

  return (
    <div className="w-[310px] h-screen overflow-y-auto p-4 bg-white/40 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="w-full h-[50px] rounded-full flex items-center justify-center text-black mb-3 gap-3">
          <img width={40} height={40} src={logo} alt="logo" />
          <h2 className="font-extrabold text-[20px]">STAT-URMON</h2>
        </div>

        {/* Foydalanuvchi kartochkasi */}
        <div className="bg-[#09b86f] w-full h-[250px] rounded-2xl p-3 flex justify-center items-center flex-col gap-0.5">
          <div className="mb-2">
            <div className="bg-white/40 h-[50px] w-[50px] flex items-center justify-center rounded-3xl">
              <User2 />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-white text-center text-lg">
              {user?.results[0]?.first_name || ""}{" "}
              {user?.results[0]?.last_name || ""}
            </h3>
            <div className="flex items-center gap-2 text-left">
              <span className="text-[white] text-[16px] font-light">
                {t("user_role")}: 
              </span>
              <h3 className="font-bold text-white text-[18px]">
                {user?.results[0]?.role || ""}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-left">
              <span className="text-[white] text-[16px] font-light">
                {t("item_78")}:
              </span>
              <h3 className="font-bold text-white text-[18px]">
                {user?.results[0]?.user_number || ""}
              </h3>
            </div>
            {user?.results[0]?.organization_name && (
              <div className="flex items-center gap-2">
                <span className="text-[white] text-[16px] font-light">
                  {t("item_12")}:
                </span>
                <h3 className="font-bold text-white text-[18px]">
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
