import { NavLink, Outlet } from "react-router-dom";
import AuthHeader from "@/components/Header/AuthHeader";
import { useTranslation } from "react-i18next";
import loginBgWinter from '@/assets/login_winter.webp';

function Auth() {
  const { t } = useTranslation();
  return (
    <div
      className="w-full h-screen"
      style={{backgroundImage:`url(${loginBgWinter})`, backgroundSize:'cover'}}
    >
      <AuthHeader />

      <div
        className="flex items-center justify-center h-screen w-full flex-col gap-10 bg-white/10"
      >
        
        <Outlet />
        {/* <Login /> */}
        <div className="bg-white py-1 px-2 rounded-2xl">
          <span className="text-[18px] text-blue-800">
            © 2025 "{t('compny_name')}" {t("auth_bottom")}
            <NavLink
              className={"text-[#2f12ee] px-2"}
              to={"tel:+998 71 207 88 77 (1010)"}
            >
              +998 71 207 88 77 ({t('phone_extension')}: 1010)
            </NavLink>
          </span>
        </div>
      </div>
    </div>
  );
}

export default Auth;
