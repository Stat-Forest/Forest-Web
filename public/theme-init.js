// Birinchi render'dan oldin tungi rejimni qo'yadi. index.html'dagi inline
// skript edi — CSP (script-src 'self') uchun alohida faylga chiqarildi.
(function () {
  try {
    var theme = localStorage.getItem("theme");
    if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {}
})();
