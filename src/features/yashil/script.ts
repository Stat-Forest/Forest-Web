/**
 * Modul yozuvi: o'zbek kirill (asosiy) yoki lotin. Faqat «Яшил маҳалла»
 * sahifalariga ta'sir qiladi; stat'ning umumiy tili (uz/ru) o'zgarmaydi.
 * Tanlov cookie'da saqlanadi; kichik tashqi store (React useSyncExternalStore).
 */
import { useSyncExternalStore } from "react";
import { getSimpleCookie, setSimpleCookie } from "@/utils/cookie";
import { SCRIPT_COOKIE } from "./constants";

export type Script = "cyr" | "lat";

let current: Script = (getSimpleCookie(SCRIPT_COOKIE) as Script) === "lat" ? "lat" : "cyr";
const listeners = new Set<() => void>();

export const getScript = (): Script => current;

export const setScript = (next: Script) => {
  if (next === current) return;
  current = next;
  try {
    setSimpleCookie(SCRIPT_COOKIE, next, 365);
  } catch {
    // cookie yozilmasa ham ishlayveradi
  }
  listeners.forEach((fn) => fn());
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useScript = (): Script => useSyncExternalStore(subscribe, getScript, getScript);
