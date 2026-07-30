import { NavLink, Outlet } from "react-router-dom";
import AuthHeader from "@/components/Header/AuthHeader";
import { useTranslation } from "react-i18next";

function Auth() {
  const { t } = useTranslation();
  return (
    <div
      className="w-full min-h-screen h-screen flex flex-col justify-between overflow-y-auto bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(https://images.photowall.com/products/58341/foggy-forest-4.jpg?h=699&q=85)`,
      }}
    >
      <div className="min-h-full w-full bg-black/40 backdrop-blur-[2px] flex flex-col justify-between flex-1">
        <AuthHeader />

        <main className="flex-1 flex items-center justify-center p-4 my-auto">
          <Outlet />
        </main>

        <footer className="py-3 px-4 text-center">
          <span className="text-sm sm:text-base text-white/90 font-medium">
            © 2025 "{t("compny_name")}" {t("auth_bottom")}{" "}
            <NavLink
              className="text-white hover:underline font-semibold px-1"
              to="tel:+998712078877"
            >
              +998 71 207 88 77 ({t("phone_extension")}: 1010)
            </NavLink>
          </span>
        </footer>
      </div>
    </div>
  );
}

export default Auth;
