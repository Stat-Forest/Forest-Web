import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "./app/store";
import ProtectedRoute from "./routes/ProtectedRoute";
import "./i18n";
import AppWrapper from "./components/AppWrapper";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { setCookie } from "./utils/cookie";
import AuthVideo from "./views/Video/AuthVideo";
import Landing from "./views/Landing";

// Lazy loading - code splitting uchun
const Auth = lazy(() => import("./views/Auth/Auth"));
const Dashboard = lazy(() => import("./views/Dashboard/Dashboard"));
const Login = lazy(() => import("./views/Auth/Login"));
const ForgetPassword = lazy(() => import("./views/Auth/ForgetPassword"));
const CheckCode = lazy(() => import("./views/Auth/CheckCode"));
const ChangePassword = lazy(() => import("./views/Auth/changePassword"));

// AOS lazy loading - faqat kerak bo'lganda yuklash
let AOS: any = null;
const loadAOS = async () => {
  if (!AOS) {
    const aosModule = await import("aos");
    AOS = aosModule.default;
    await import("aos/dist/aos.css");
  }
  return AOS;
};

export const user_role = import.meta.env.USER_ROLE;

function App() {
  const reportIds = useSelector((state: RootState) => state.report.reportId);

  useEffect(() => {
    // Xavfsiz cookie'ga saqlaymiz (1 kun muddat)
    if (reportIds) {
      setCookie("reportId", String(reportIds), 1, {
        secure: import.meta.env.PROD,
        sameSite: "strict",
      });
    }
  }, [reportIds]);

  // AOS'ni lazy load qilamiz - blocking operatsiyalarni oldini olish uchun
  useEffect(() => {
    // AOS'ni keyingi event loop'da yuklash
    const initAOS = async () => {
      try {
        const aos = await loadAOS();
        aos.init({
          duration: 700,
          once: true,
          easing: "ease-out-cubic",
        });
      } catch (error) {
        console.warn("AOS yuklanmadi:", error);
      }
    };

    // Defer AOS initialization - sahifa render bo'lgandan keyin
    const timeoutId = setTimeout(initAOS, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  // Loading component
  const LoadingFallback = () => (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="loader"></div>
    </div>
  );

  return (
    <AppWrapper>
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
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />

          <Route path="/auth" element={<Auth />}>
            <Route index element={<Login />} />
            <Route path="forget-password" element={<ForgetPassword />} />
            <Route path="check-code" element={<CheckCode />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="auth_video" element={<AuthVideo />} />
          </Route>

          <Route
            path="/*"
            element={
              <ProtectedRoute allowedRoles={user_role}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/unauthorized"
            element={<Navigate to="/auth" replace />}
          />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    </AppWrapper>
  );
}

export default App;
