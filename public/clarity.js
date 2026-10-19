// Microsoft Clarity (session replay) FAQAT ochiq landing sahifada (audit A6):
// tizim ichidagi sahifalarda (hisobotlar, ijarachilar PINFL/pasporti) uchinchi
// tomon skripti yuklanmaydi. SPA ichida landing'dan boshqa sahifaga o'tilganda
// skript allaqachon yuklangan bo'lsa ham, faqat landing'da yoqilgan sessiya
// davom etadi — shuning uchun login sahifasiga o'tishda uni to'xtatamiz.
(function (c, l, a, r, i, t, y) {
  var p = l.location.pathname;
  if (p !== "/" && p !== "/landing") return;
  c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
  t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
  y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  var stopOnLeave = function () {
    var q = l.location.pathname;
    if (q !== "/" && q !== "/landing" && typeof c[a] === "function") {
      try { c[a]("stop"); } catch (e) {}
      c.removeEventListener("popstate", stopOnLeave);
    }
  };
  c.addEventListener("popstate", stopOnLeave);
  var push = history.pushState;
  history.pushState = function () { var r2 = push.apply(this, arguments); stopOnLeave(); return r2; };
})(window, document, "clarity", "script", "v6hcd4v83q");
