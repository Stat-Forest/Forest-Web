import React, { ReactNode } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { token, user } = useSelector((state: any) => state.auth);

  if (!user) {
    return <Navigate to="/auth" />;
  }

  // Sahifa qayta yuklangan: profil persist'dan bor, access token esa faqat
  // xotirada — AppWrapper HttpOnly refresh cookie orqali olguncha kutamiz
  // (muvaffaqiyatsiz bo'lsa u logout qiladi va user null bo'ladi).
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500" aria-busy="true">
        Yuklanmoqda…
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
