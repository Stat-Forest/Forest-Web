import MainContainer from "@/containers/MainContainer/MainContainer";
import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";
import { useLocation } from "react-router-dom";
import ReportStatsSection from "@/components/Dashboard/ReportStats/ReportStatsSection";

function MainPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  // Statistika faqat bosh sahifaning o'zida (ichki /main/* ro'yxatlarida emas)
  const isHome = pathname.replace(/\/+$/, "") === "/main";
  return (
    <div className="px-3 py-4 space-y-4">
      {/* Modern Glassmorphism Header */}
      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs backdrop-blur-md transition-colors flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
              {t("item_8")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t("home_subtitle")}
            </p>
          </div>
        </div>
      </div>

      {isHome && <ReportStatsSection />}

      {/* container */}
      <MainContainer />
    </div>
  );
}

export default MainPage;
