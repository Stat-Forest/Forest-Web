import CryptoJS from "crypto-js";
import { setCookie, getCookie, removeCookie } from "./cookie";

/**
 * Ma'lumotni AES yordamida shifrlab xavfsiz cookie'ga saqlaydi.
 * @param name - Cookie nomi
 * @param data - saqlanadigan ma'lumot
 * @param key - shifrlash kaliti
 * @param days - Cookie yashash muddati (kunlarda, default: 30)
 */
export const encryptData = (
  name: string,
  data: unknown,
  key: string,
  days: number = 30
): void => {
  if (data === undefined || data === null) {
    console.warn(`encryptData: ${name} uchun hech qanday ma'lumot topilmadi`);
    return;
  }

  try {
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      key
    ).toString();

    // Xavfsiz cookie'ga saqlaymiz
    // Production'da secure=true, development'da false bo'lishi mumkin
    const isProduction = import.meta.env.PROD;
    setCookie(name, encrypted, days, {
      secure: isProduction, // Production'da faqat HTTPS
      sameSite: "strict", // CSRF himoyasi
    });
  } catch (error) {
    console.error("encryptData: Xatolik yuz berdi", error);
  }
};

/**
 * AES yordamida cookie'dan ma'lumotni deshifrlaydi.
 * @param name - Cookie nomi
 * @param key - deshifrlash kaliti
 * @returns deshifrlangan obyekt yoki null
 */
export const decryptData = (name: string, key: string): unknown => {
  const encrypted = getCookie(name);

  if (!encrypted) {
    console.warn(`decryptData: ${name} uchun cookie'da hech nima topilmadi`);
    return null;
  }

  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(
      CryptoJS.enc.Utf8
    );

    if (!decrypted) {
      throw new Error("Bo'sh yoki noto'g'ri deshifrlangan string");
    }

    return JSON.parse(decrypted);
  } catch (error) {
    console.error("decryptData: Deshifrlashda xatolik:", error);
    removeCookie(name); // buzilgan bo'lsa, tozalab yuboramiz
    return null;
  }
};

/**
 * Cookie'dan ma'lumotni tozalaydi
 * @param name - Cookie nomi
 */
export const removeEncryptedData = (name: string): void => {
  removeCookie(name);
};
