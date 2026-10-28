import { useSelector } from "react-redux";
import { skipToken } from "@reduxjs/toolkit/query";
import type { RootState } from "@/app/store";
import { useGetYashilMeQuery } from "@/services/yashilApi";
import { YASHIL_ROLES } from "./constants";
import type { Cabinet, YashilMe } from "./types";

/** Faqat «Яшил маҳалла» modulini ko'radigan rollar (stat'ning qolgan qismi yopiq). */
export const isYashilRole = (role?: string | null): boolean =>
  !!role && (YASHIL_ROLES as readonly string[]).includes(role);

export interface YashilAccess {
  role: string | undefined;
  /** Rol faqat modul uchun (ym_*): stat menyusi yashiriladi. */
  isYashilOnly: boolean;
  /** `me/` yuklanmoqda. */
  isLoading: boolean;
  me: YashilMe | undefined;
  /** Modulga kirish bor: a'zolik yoki modul admini. */
  hasAccess: boolean;
  cabinet: Cabinet | null;
  canPrepare: boolean;
  canSign: boolean;
}

/**
 * Modulga kirish holati. `support_admin` uchun so'rov yuborilmaydi (backend 403).
 * Natija RTK keshida — sidebar va sahifalar bitta so'rovni bo'lishadi.
 */
export function useYashilAccess(): YashilAccess {
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const token = useSelector((state: RootState) => state.auth.token);
  const skip = !token || !role || role === "support_admin";
  const { data: me, isLoading } = useGetYashilMeQuery(skip ? skipToken : undefined);
  const cabinet = me?.active_cabinet ?? null;
  return {
    role,
    isYashilOnly: isYashilRole(role),
    isLoading: !skip && isLoading,
    me,
    hasAccess: !!me && (me.is_member || me.is_admin),
    cabinet,
    canPrepare: !!cabinet?.can_prepare,
    canSign: !!cabinet?.can_sign,
  };
}
