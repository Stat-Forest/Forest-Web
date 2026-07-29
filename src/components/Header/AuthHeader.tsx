import { useState, useEffect } from "react";
import i18n from "@/i18n";
import { useDispatch, useSelector } from "react-redux";
import { setLanguage } from "@/features/languageSlice";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { RootState } from "@/app/store";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { VideoIcon, Sun, Moon, Menu, X, Layers, Calendar, Home } from "lucide-react";

function AuthHeader({ position: _position = false }: { position?: boolean } = {}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const currentLang = useSelector((state: RootState) => state.language.lang);
  const { t } = useTranslation();

  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  // Close menu on route or resize
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const isAuthPage = location.pathname.includes("/auth");
  const isLanding = location.pathname === "/" || location.pathname === "/landing";

  const handleChangeLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    dispatch(setLanguage(lang));
  };

  const handleLogoClick = () => {
    if (isLanding) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/landing");
    }
  };

  const scrollToSection = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-300 ${
        isLanding
          ? "bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border-b-2 border-[#00BC7D] shadow-xs"
          : "bg-transparent"
      }`}
    >
      <div className="flex h-[68px] sm:h-[82px] items-center justify-between px-4 sm:px-6">
        {/* LOGO */}
        <div
          onClick={handleLogoClick}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group shrink-0"
        >
          <img
            src={logo}
            alt="logo"
            className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl transition-transform duration-200 group-hover:scale-105"
          />
          <h2
            className={`font-extrabold text-lg sm:text-[22px] tracking-tight whitespace-nowrap transition-colors duration-200 ${
              isAuthPage ? "text-white" : "text-slate-900 dark:text-white group-hover:text-[#00BC7D]"
            }`}
          >
            STAT-URMON
          </h2>
        </div>

        {/* DESKTOP RIGHT SIDE */}
        <div className="hidden md:flex items-center gap-3">
          {/* THEME TOGGLE */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle theme"
            className="!h-[42px] !w-[42px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-amber-500 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer shrink-0"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} className="text-slate-700" />}
          </button>

          {/* Landing da kirish button */}
          {!isAuthPage && (
            <Button
              onClick={() => navigate("/auth")}
              className="!h-[42px] py-0 bg-[#00BC7D] hover:bg-[#00a36c] text-white font-semibold rounded-lg px-5 border border-[#00BC7D] box-border flex items-center justify-center transition-colors"
            >
              {t("login") || "Kirish"}
            </Button>
          )}

          {/* Auth page ichida */}
          {isAuthPage && (
            <>
              <Button
                onClick={() => navigate("/auth/auth_video")}
                className="!h-[42px] py-0 bg-[#00BC7D] hover:bg-[#00a36c] text-white font-semibold rounded-lg px-5 border border-[#00BC7D] box-border flex items-center justify-center gap-2 transition-colors"
              >
                <VideoIcon size={18} />
                {t("item_65")}
              </Button>

              <Button
                onClick={() => navigate("/landing")}
                className="!h-[42px] py-0 bg-[#00BC7D] hover:bg-[#00a36c] text-white font-semibold rounded-lg px-5 border border-[#00BC7D] box-border flex items-center justify-center transition-colors"
              >
                {t("auth_statistics")}
              </Button>
            </>
          )}

          {/* LANGUAGE */}
          <Select value={currentLang} onValueChange={handleChangeLang}>
            <SelectTrigger className="w-[120px] !h-[42px] py-0 shadow-none bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium box-border flex items-center justify-between">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uz">O'zbek</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* MOBILE HAMBURGER BUTTON */}
        <div className="flex md:hidden items-center gap-2">
          {/* Quick theme toggle icon on header bar for fast access */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle theme"
            className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-amber-500 dark:text-amber-400"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} className="text-slate-700" />}
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            type="button"
            aria-label="Toggle navigation menu"
            className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition-colors"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN MENU DRAWER */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/98 dark:bg-slate-900/98 backdrop-blur-lg px-4 py-5 shadow-2xl space-y-4 animate-in slide-in-from-top duration-200">
          {/* Quick Nav Links if on Landing */}
          {isLanding && (
            <div className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <Home size={18} className="text-[#00BC7D]" />
                Bosh sahifa
              </button>

              <button
                onClick={() => scrollToSection("strategik-korsatkichlar")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <Layers size={18} className="text-[#00BC7D]" />
                Strategik ko'rsatkichlar
              </button>

              <button
                onClick={() => scrollToSection("operatsion-tahlil")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <Calendar size={18} className="text-[#00BC7D]" />
                Operatsion tahlil
              </button>
            </div>
          )}

          {/* Controls: Language & Login */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-400">Til:</span>
              <Select value={currentLang} onValueChange={handleChangeLang}>
                <SelectTrigger className="w-[110px] h-[38px] py-0 shadow-none bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-between">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uz">O'zbek</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isAuthPage && (
              <Button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/auth");
                }}
                className="h-[38px] py-0 bg-[#00BC7D] hover:bg-[#00a36c] text-white font-bold rounded-lg px-5 text-xs border border-[#00BC7D] flex items-center justify-center transition-colors"
              >
                {t("login") || "Kirish"}
              </Button>
            )}

            {isAuthPage && (
              <Button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/landing");
                }}
                className="h-[38px] py-0 bg-[#00BC7D] hover:bg-[#00a36c] text-white font-bold rounded-lg px-4 text-xs border border-[#00BC7D] flex items-center justify-center transition-colors"
              >
                {t("auth_statistics")}
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default AuthHeader;
