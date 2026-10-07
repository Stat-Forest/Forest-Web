import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { BILLING_WRITER_ROLES } from "./constants";

export const BILLING_USER_ROLE = "billing_user";

export const isBillingWriterRole = (role?: string | null): boolean =>
  !!role && (BILLING_WRITER_ROLES as readonly string[]).includes(role);

export interface BillingAccess {
  role: string | undefined;
  /** Faqat Ijara billing bo'limini ko'radigan rol. */
  isBillingUser: boolean;
  /** Yozish huquqi: `billing_user` yoki `super_admin`. Qolganlar — faqat o'qish. */
  canEdit: boolean;
}

export function useBillingAccess(): BillingAccess {
  const role = useSelector((state: RootState) => state.auth.user?.role);
  return {
    role,
    isBillingUser: role === BILLING_USER_ROLE,
    canEdit: isBillingWriterRole(role),
  };
}
