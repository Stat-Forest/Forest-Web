import { encryptData } from "./crypto";
import { getCookie } from "./cookie";
import AES from "crypto-js/aes";
import Utf8 from "crypto-js/enc-utf8";

/**
 * Eski localStorage'dan ma'lumotlarni cookie'ga ko'chiradi
 * Bu funksiya bir marta ishlatiladi va eski ma'lumotlarni yangi formatga o'tkazadi
 * Async qilingan va defer qilingan - blocking operatsiyalarni oldini olish uchun
 */
export const migrateLocalStorageToCookies = (): void => {
  // Migration'ni async qilamiz va defer qilamiz - blocking operatsiyalarni oldini olish uchun
  // Bu sahifaning render bo'lishini kechiktirmaydi
  if (typeof window === "undefined") return;

  // Migration'ni keyingi event loop'da ishlatish uchun setTimeout
  setTimeout(() => {
    try {
    // Token migration
    const oldToken = localStorage.getItem("token");
    const cookieToken = getCookie("token");

    if (oldToken && !cookieToken) {
      try {
        // Eski token shifrlangan bo'lishi mumkin, deshifrlaymiz
        const decrypted = AES.decrypt(oldToken, "token").toString(
          Utf8
        );
        if (decrypted) {
          const tokenValue = JSON.parse(decrypted);
          encryptData("token", tokenValue, "token", 30);
        } else {
          // Agar deshifrlanmasa, to'g'ridan-to'g'ri saqlaymiz
          encryptData("token", oldToken, "token", 30);
        }
      } catch {
        // Agar xatolik bo'lsa, to'g'ridan-to'g'ri saqlaymiz
        encryptData("token", oldToken, "token", 30);
      }
      localStorage.removeItem("token");
    }

    // User migration
    const oldUser = localStorage.getItem("user");
    const cookieUser = getCookie("user");

    if (oldUser && !cookieUser) {
      try {
        // Eski user shifrlangan bo'lishi mumkin, deshifrlaymiz
        const decrypted = AES.decrypt(oldUser, "user").toString(
          Utf8
        );
        if (decrypted) {
          const userValue = JSON.parse(decrypted);
          encryptData("user", userValue, "user", 30);
        } else {
          // Agar deshifrlanmasa, to'g'ridan-to'g'ri saqlaymiz
          encryptData("user", oldUser, "user", 30);
        }
      } catch {
        // Agar xatolik bo'lsa, to'g'ridan-to'g'ri saqlaymiz
        encryptData("user", oldUser, "user", 30);
      }
      localStorage.removeItem("user");
    }

    // Refresh token migration
    const oldRefresh = localStorage.getItem("refresh");
    const cookieRefresh = getCookie("refresh");

    if (oldRefresh && !cookieRefresh) {
      try {
        // Eski refresh shifrlangan bo'lishi mumkin, deshifrlaymiz
        const decrypted = AES.decrypt(oldRefresh, "refresh").toString(
          Utf8
        );
        if (decrypted) {
          const refreshValue = JSON.parse(decrypted);
          encryptData("refresh", refreshValue, "refresh", 30);
        } else {
          // Agar deshifrlanmasa, to'g'ridan-to'g'ri saqlaymiz
          encryptData("refresh", oldRefresh, "refresh", 30);
        }
      } catch {
        // Agar xatolik bo'lsa, to'g'ridan-to'g'ri saqlaymiz
        encryptData("refresh", oldRefresh, "refresh", 30);
      }
      localStorage.removeItem("refresh");
    }
    } catch (error) {
      console.error("Migration xatolik:", error);
    }
  }, 0); // Keyingi event loop'da ishlatish
};

