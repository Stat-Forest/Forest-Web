// Leaflet `bindPopup` innerHTML'ga yozadi — API'dan kelgan matn (ijarachi
// nomi, xo'jalik nomi, ...) to'g'ridan-to'g'ri qo'yilsa saqlangan HTML/skript
// ishga tushishi mumkin. Shablon satriga qo'yishdan oldin escape qilamiz.
export const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};
