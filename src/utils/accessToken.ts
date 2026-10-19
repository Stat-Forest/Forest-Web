// Access token faqat xotirada (Redux + shu modul). localStorage/cookie'ga
// yozilmaydi — XSS yoki uchinchi tomon skripti uni o'qiy olmasin (audit A5).
// Refresh token esa backend bergan HttpOnly cookie'da, JS'ga ko'rinmaydi.
let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;
