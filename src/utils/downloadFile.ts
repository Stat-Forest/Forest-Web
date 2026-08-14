/**
 * Backenddan kelgan blob'ni brauzerda yuklab olish.
 */
export const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * RTK Query xatosidan foydalanuvchiga ko'rsatiladigan matnni ajratib oladi.
 * Backend `{"detail": "..."}` yoki `{"file": "..."}` ko'rinishida qaytaradi.
 */
export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const data = (error as { data?: unknown })?.data;

  if (typeof data === "string" && data.trim()) return data;

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    const detail = record.detail ?? record.message ?? record.error;
    if (typeof detail === "string" && detail.trim()) return detail;

    // Maydon bo'yicha xatolar: { file: "This field is required." }
    for (const value of Object.values(record)) {
      if (typeof value === "string" && value.trim()) return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }

  return fallback;
};
