import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { BILLING_WRITER_ROLES } from "./constants";

export const BILLING_USER_ROLE = "billing_user";
export const BILLING_SUPER_ROLE = "billing_super";

/**
 * Faqat Ijara billing + "O'rmon kadastri va monitoringi" (read-only) bo'limini
 * ko'radigan rollar: `billing_user` (o'z xo'jaliklari) va `billing_super` (barchasi).
 */
export const BILLING_ROLES = [BILLING_USER_ROLE, BILLING_SUPER_ROLE] as const;

export const isBillingRole = (role?: string | null): boolean =>
  !!role && (BILLING_ROLES as readonly string[]).includes(role);

export const isBillingWriterRole = (role?: string | null): boolean =>
  !!role && (BILLING_WRITER_ROLES as readonly string[]).includes(role);

export interface BillingAccess {
  role: string | undefined;
  /** Billing rollari (`billing_user` / `billing_super`): stat'ning qolgan qismi yopiq. */
  isBillingUser: boolean;
  /** Yozish huquqi: `billing_user`, `billing_super` yoki `super_admin`. Qolganlar — faqat o'qish. */
  canEdit: boolean;
}

export function useBillingAccess(): BillingAccess {
  const role = useSelector((state: RootState) => state.auth.user?.role);
  return {
    role,
    isBillingUser: isBillingRole(role),
    canEdit: isBillingWriterRole(role),
  };
}
