import { Outlet } from "react-router-dom";
import MainPage from "./MainPage";

function Main() {
  return (
    <div>
      <MainPage />
      <Outlet />
    </div>
  );
}

export default Main;
