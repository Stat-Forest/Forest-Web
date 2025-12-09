/**
 * HTTP URL'ni HTTPS'ga o'zgartirish - Mixed Content muammosini hal qilish uchun
 * @param url - HTTP yoki HTTPS URL
 * @returns HTTPS URL
 */
export const ensureHttps = (url: string | null | undefined): string => {
  if (!url) return "";
  
  // Agar URL http:// bilan boshlansa, https:// ga o'zgartirish
  if (url.startsWith("http://")) {
    return url.replace("http://", "https://");
  }
  
  // Agar URL https:// bilan boshlansa yoki relative bo'lsa, o'zgartirmasdan qaytarish
  return url;
};

/**
 * Image URL'ni HTTPS'ga o'zgartirish va error handling
 * @param url - Image URL
 * @param fallback - Error bo'lganda ko'rsatiladigan fallback URL
 * @returns HTTPS URL yoki fallback
 */
export const getSecureImageUrl = (
  url: string | null | undefined,
  fallback?: string
): string => {
  const secureUrl = ensureHttps(url);
  
  if (!secureUrl && fallback) {
    return fallback;
  }
  
  return secureUrl;
};

