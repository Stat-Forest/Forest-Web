import { Outlet } from "react-router-dom";
import MainPage from "./MainPage";

function index() {
  return (
    <div>
      <MainPage />
      <Outlet />
    </div>
  );
}

export default index;
