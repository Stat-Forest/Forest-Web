/**
 * Modul tili STAT-URMON umumiy tanloviga ergashadi (D-28): `uz` — o'zbek lotin, `ru` — rus.
 * Alohida almashtirgich yo'q; til header'dagi tanlagich orqali o'zgaradi.
 */
import { useTranslation } from "react-i18next";

export type Script = "lat" | "ru";

export const scriptFor = (lang?: string | null): Script => (lang?.startsWith("ru") ? "ru" : "lat");

export const useScript = (): Script => {
  const { i18n } = useTranslation();
  return scriptFor(i18n.language);
};
