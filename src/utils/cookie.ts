/**
 * Cookie'dan ma'lumotni o'qiydi
 * @param name - Cookie nomi
 * @returns Cookie qiymati yoki null
 */
export function getCookie(name: string): string | null {
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(name + "=")) {
      return decodeURIComponent(cookie.substring(name.length + 1));
    }
  }
  return null;
}

/**
 * Xavfsiz cookie'ni o'rnatadi
 * @param name - Cookie nomi
 * @param value - Cookie qiymati
 * @param days - Cookie yashash muddati (kunlarda)
 * @param options - Qo'shimcha sozlamalar (secure, sameSite)
 */
export function setCookie(
  name: string,
  value: string,
  days: number = 30,
  options: {
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
    path?: string;
  } = {}
): void {
  const {
    secure = true, // Production'da har doim secure
    sameSite = "strict", // CSRF hujumlaridan himoya qilish
    path = "/",
  } = options;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  let cookieString = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=${path}`;

  if (secure) {
    cookieString += "; secure"; // Faqat HTTPS orqali yuboriladi
  }

  cookieString += `; samesite=${sameSite}`; // CSRF himoyasi

  document.cookie = cookieString;
}

/**
 * Cookie'ni o'chiradi
 * Cookie yaratilgandagi sozlamalarga mos kelishi uchun,
 * ikkala variant bilan ham (secure va non-secure) o'chirishga harakat qiladi
 * @param name - Cookie nomi
 * @param path - Cookie path'i (default: "/")
 */
export function removeCookie(name: string, path: string = "/"): void {
  const isProduction = import.meta.env.PROD;
  const expires = "Thu, 01 Jan 1970 00:00:00 UTC";

  // Cookie'ni o'chirish uchun ikkala variant bilan ham harakat qilamiz
  // Chunki cookie yaratilganda secure flag environment'ga qarab o'zgaradi
  // Development'da secure=false, production'da secure=true bo'ladi
  // Browser cookie'ni o'chirish uchun yaratilgandagi xuddi shu sozlamalar bilan o'chirish kerak

  // 1. Non-secure variant (development uchun) - sameSite bilan
  document.cookie = `${name}=; path=${path}; expires=${expires}; samesite=strict`;

  // 2. Secure variant (production uchun) - sameSite bilan
  document.cookie = `${name}=; path=${path}; expires=${expires}; secure; samesite=strict`;

  // 3. Qo'shimcha variantlar - agar cookie boshqa sozlamalar bilan yaratilgan bo'lsa
  // SameSite variantlari
  document.cookie = `${name}=; path=${path}; expires=${expires}; samesite=lax`;
  document.cookie = `${name}=; path=${path}; expires=${expires}; secure; samesite=lax`;
  document.cookie = `${name}=; path=${path}; expires=${expires}; samesite=none`;
  document.cookie = `${name}=; path=${path}; expires=${expires}; secure; samesite=none`;

  // 4. Minimal variantlar (agar sameSite bo'lmasa)
  document.cookie = `${name}=; path=${path}; expires=${expires}`;
  if (isProduction) {
    document.cookie = `${name}=; path=${path}; expires=${expires}; secure`;
  }
}

/**
 * Cookie'ga oddiy string qiymat saqlash (shifrlanmagan)
 * @param name - Cookie nomi
 * @param value - Cookie qiymati
 * @param days - Cookie yashash muddati (kunlarda)
 */
export function setSimpleCookie(name: string, value: string, days: number = 30): void {
  setCookie(name, value, days, {
    secure: import.meta.env.PROD,
    sameSite: "strict",
  });
}

/**
 * Cookie'dan oddiy string qiymat o'qish
 * @param name - Cookie nomi
 * @returns Cookie qiymati yoki null
 */
export function getSimpleCookie(name: string): string | null {
  return getCookie(name);
}
