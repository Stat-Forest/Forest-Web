import { Outlet } from "react-router-dom";
import MainPage from "./MainPage";
import Mainreports from "./Children/MainReports";

function Main() {
  return (
    <div>
      <MainPage />
      <Outlet />
      <Mainreports/>
    </div>
  );
}

export default Main;
