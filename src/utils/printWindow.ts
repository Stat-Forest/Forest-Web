/**
 * Chop etish oynasi (window.open + document.write) opener'ning CSP'sini oladi:
 * inline onclick / <script> bloklanadi (audit F4). Tugmalar va avtomatik
 * chop etish shu yerdan — opener skriptidan — ulanadi.
 */
export const wirePrintWindow = (win: Window, autoPrintDelayMs = 1000): void => {
  const doc = win.document;
  doc.querySelector('[data-action="print"]')?.addEventListener("click", () => win.print());
  doc.querySelector('[data-action="close"]')?.addEventListener("click", () => win.close());
  win.setTimeout(() => {
    try {
      win.print();
    } catch {
      /* oyna yopilgan */
    }
  }, autoPrintDelayMs);
};
