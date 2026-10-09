import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useBillingAccess } from "@/features/billing/permissions";
import { BILLING_ROUTES } from "@/features/billing/constants";

/**
 * Faqat yozish huquqi bor rollar (`billing_user`, `billing_super`, `super_admin`) kiradigan
 * marshrutlar (yaratish, Excel import). Qolganlar shartnomalar ro'yxatiga
 * qaytariladi.
 */
function BillingEditRoute({ children }: { children: ReactNode }) {
  const { canEdit } = useBillingAccess();
  if (!canEdit) {
    return <Navigate to={BILLING_ROUTES.contracts} replace />;
  }
  return <>{children}</>;
}

export default BillingEditRoute;
