import { NavLink, Outlet } from "react-router-dom";
import AuthHeader from "@/components/Header/AuthHeader";
import { useTranslation } from "react-i18next";

function Auth() {
  const { t } = useTranslation();
  return (
    <div
      className="w-full h-screen"
      style={{
        backgroundImage:
          "url(https://images.photowall.com/products/58341/foggy-forest-4.jpg?h=699&q=85)",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      <AuthHeader />

      <div
        className="flex items-center justify-center h-screen w-full flex-col gap-10"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        
        <Outlet />
        {/* <Login /> */}
        <div>
          <span className="text-[14px] text-white">
            © 2025 "O'rmonlarni raqamlashtirish markazi davlat muassasasi" {t("auth_bottom")}
            <NavLink
              className={"text-[#09B86F] px-2"}
              to={"tel:+998 71 207 07 70"}
            >
              +998 71 207 07 70 (ichki raqami: 1073)
            </NavLink>
          </span>
        </div>
      </div>
    </div>
  );
}

export default Auth;
