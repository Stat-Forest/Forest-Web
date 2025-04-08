import { NavLink } from "react-router-dom";
import Login from "./Login";

function Auth() {
  return (
    <div className="w-full h-screen">
      <div className="flex items-center justify-center h-screen w-full flex-col gap-10">
        <Login />
        <div>
          <span className="text-[14px]">
            © 2025 "Urmontexnoservis" DUK, Texnik qo‘llab-quvvatlash:
            <NavLink className={'text-[#09B86F] px-1'} to={"tel:+998 95 195 99 29"}>+998 95 195 99 29</NavLink>
          </span>
        </div>
      </div>
    </div>
  );
}

export default Auth;
