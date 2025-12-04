import { Navigate, Route, Routes } from "react-router-dom";
import Auth from "./views/Auth/Auth";
import Dashboard from "./views/Dashboard/Dashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import "./i18n";
import { useSelector } from "react-redux";
import { RootState } from "./app/store";
import { useEffect } from "react";
import ForgetPassword from "./views/Auth/ForgetPassword";
import Login from "./views/Auth/Login";
import CheckCode from "./views/Auth/CheckCode";
import ChangePassword from "./views/Auth/changePassword";
import { TestModeCarousel } from "./components/TestModeCarousel";
import AppWrapper from "./components/AppWrapper";
import AOS from "aos";
import "aos/dist/aos.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// import Landing from "./views/Landing";

export const user_role = import.meta.env.USER_ROLE;

function App() {
  const reportIds = useSelector((state: RootState) => state.report.reportId);

  useEffect(() => {
    document.cookie = `reportId=${reportIds}; path=/; max-age=86400`;
  }, [reportIds]);

  useEffect(() => {
    AOS.init({
      duration: 700,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  return (
    <AppWrapper>
      <TestModeCarousel />
       <ToastContainer
        position="top-right"
        autoClose={3500} // 3.5 sekund
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Routes>
        <Route path="/auth" element={<Auth />}>
          <Route index element={<Login />} />
          <Route path="forget-password" element={<ForgetPassword />} />
          <Route path="check-code" element={<CheckCode />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>
        {/* <Route path="/" element={<Landing />} /> */}
        <Route
          path="/*"
          element={
            <ProtectedRoute allowedRoles={user_role}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<Navigate to="/auth" replace />} />
      </Routes>
    </AppWrapper>
  );
}

export default App;
