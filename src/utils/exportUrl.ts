import { base_url } from "@/services/baseUrl";

/**
 * Backend bergan `download_url`ni API origin'iga bog'laydi (audit C9).
 * Boshqa origin'dagi URL'ga Bearer token yuborilmaydi — null qaytadi.
 */
export const resolveExportUrl = (downloadUrl: string): string | null => {
  if (!downloadUrl) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const apiOrigin = new URL(base_url, origin).origin;
  let url: URL;
  try {
    if (downloadUrl.startsWith("/")) {
      url = new URL(`${base_url}${downloadUrl}`, origin);
    } else if (/^https?:\/\//i.test(downloadUrl)) {
      url = new URL(downloadUrl);
    } else {
      url = new URL(`${base_url}/${downloadUrl}`, origin);
    }
  } catch {
    return null;
  }
  return url.origin === apiOrigin ? url.toString() : null;
};
