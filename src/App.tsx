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
import { USER_ROLE } from "./services/constants";

// Lazy loading - code splitting uchun
const Landing = lazy(() => import("./views/Landing"));
const VerifySignature = lazy(() => import("./views/Verify/VerifySignature"));
const Auth = lazy(() => import("./views/Auth/Auth"));
const Dashboard = lazy(() => import("./views/Dashboard/Dashboard"));
const Login = lazy(() => import("./views/Auth/Login"));
const ForgetPassword = lazy(() => import("./views/Auth/ForgetPassword"));
const CheckCode = lazy(() => import("./views/Auth/CheckCode"));
const ChangePassword = lazy(() => import("./views/Auth/changePassword"));

// Env ro'yxati USER_ROLE konstantasi bilan BIRLASHTIRILADI (union) — GitHub
// secret yangilanmasa ham yangi rollar (masalan billing_user) ishlaydi.
const parseAllowedRoles = (): string[] => {
  const raw =
    import.meta.env.VITE_USER_ROLE ?? "";
  const fromEnv: string[] = [];
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((r) => {
          if (typeof r === "string" && r.trim()) fromEnv.push(r.trim());
        });
      }
    } catch {
      // Env noto'g'ri bo'lsa faqat konstantadan foydalanamiz.
    }
  }
  return Array.from(new Set([...USER_ROLE, ...fromEnv]));
};

export const user_role = parseAllowedRoles();

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
          {/* Hisobot imzosini tekshirish — QR koddan, login'siz */}
          <Route path="/verify/:id" element={<VerifySignature />} />

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
