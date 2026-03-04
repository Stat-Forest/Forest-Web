import { NavLink, Outlet } from "react-router-dom";
import AuthHeader from "@/components/Header/AuthHeader";
import { useTranslation } from "react-i18next";

function Auth() {
  const { t } = useTranslation();
  return (
    <div
      className="w-full h-screen"
      style={{backgroundImage:`url(https://images.photowall.com/products/58341/foggy-forest-4.jpg?h=699&q=85)`, backgroundSize:'cover'}}
    >
      <div className="h-full w-full bg-black/40">

      <AuthHeader />

      <div
        className="flex items-center justify-center h-screen w-full flex-col gap-10 bg-white/10"
        >
        
        <Outlet />
        {/* <Login /> */}
        <div className=" py-1 px-2 rounded-2xl">
          <span className="text-[18px] text-white">
            © 2025 "{t('compny_name')}" {t("auth_bottom")}
            <NavLink
              className={"text-white px-2"}
              to={"tel:+998 71 207 88 77 (1010)"}
              >
              +998 71 207 88 77 ({t('phone_extension')}: 1010)
            </NavLink>
          </span>
        </div>
      </div>
              </div>
    </div>
  );
}

export default Auth;
