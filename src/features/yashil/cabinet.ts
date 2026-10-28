/**
 * Faol kabinet tanlovi (bir foydalanuvchi bir nechta tashkilot nomidan ishlashi mumkin).
 * Tanlov cookie'da; har so'rovga `X-Yashil-Cabinet` header'i qo'shiladi (yashilApi).
 */
import { useSyncExternalStore } from "react";
import { getSimpleCookie, setSimpleCookie, removeCookie } from "@/utils/cookie";
import { CABINET_COOKIE } from "./constants";

let current: string | null = getSimpleCookie(CABINET_COOKIE) || null;
const listeners = new Set<() => void>();

export const getCabinetId = (): string | null => current;

export const setCabinetId = (id: string | null) => {
  if (id === current) return;
  current = id;
  try {
    if (id) setSimpleCookie(CABINET_COOKIE, id, 30);
    else removeCookie(CABINET_COOKIE);
  } catch {
    // cookie yozilmasa ham ishlayveradi
  }
  listeners.forEach((fn) => fn());
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useCabinetId = (): string | null => useSyncExternalStore(subscribe, getCabinetId, getCabinetId);
