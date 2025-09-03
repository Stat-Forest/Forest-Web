import { NavLink, Outlet } from "react-router-dom";
import AuthHeader from "@/components/Header/AuthHeader";

function Auth() {
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
            © 2025 "Urmontexnoservis" DUK, Texnik qo‘llab-quvvatlash:
            <NavLink
              className={"text-[#09B86F] px-2"}
              to={"tel:+998 95 195 99 29"}
            >
              +998 95 195 99 29
            </NavLink>
          </span>
        </div>
      </div>
    </div>
  );
}

export default Auth;
