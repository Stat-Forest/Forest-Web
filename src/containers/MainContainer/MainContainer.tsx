import { RootState } from "@/app/store";
import { useGetDashboardReportQuery } from "@/services/reportsApi";
import {
  CalendarPlus,
  CalendarRange,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  FileText,
  FolderSync,
  History,
  IdCard,
  Mail,
  PencilLine,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
// AOS lazy loading - faqat kerak bo'lganda yuklash
let AOS: any = null;
const loadAOS = async () => {
  if (!AOS) {
    const aosModule = await import("aos");
    AOS = aosModule.default;
    await import("aos/dist/aos.css");
  }
  return AOS;
};

function MainContainer() {
  const {
    data: dashboard_data,
    isLoading,
    error,
  } = useGetDashboardReportQuery();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user_role = useSelector((state: RootState) => state.auth.user?.role);

  // AOS'ni lazy load qilamiz - blocking operatsiyalarni oldini olish uchun
  useEffect(() => {
    const initAOS = async () => {
      try {
        const aos = await loadAOS();
        aos.init({
          duration: 700,
          once: true,
          easing: "ease-out-cubic",
        });
      } catch (error) {
        console.warn("AOS yuklanmadi:", error);
      }
    };

    // Defer AOS initialization - sahifa render bo'lgandan keyin
    const timeoutId = setTimeout(initAOS, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-lg text-red-500">Xatolik yuz berdi!</div>;
  }

  const cardClasses =
    "w-full min-h-[90px] rounded-2xl flex items-center gap-4 px-4 py-3 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-300 bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-xs backdrop-blur-md";

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-4 px-2">
        {/* Sent Reports */}
        <div
          data-aos="fade-up"
          onClick={() => navigate("/main/send-report")}
          className={cardClasses}
        >
          <div className="w-[44px] h-[44px] rounded-xl flex items-center justify-center shadow-xs bg-amber-500 shrink-0">
            <FileText color="white" size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-snug">
              {t("item_1")}
            </h3>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {dashboard_data?.sent_reports || 0} {t("count")}
            </span>
          </div>
        </div>

        {/* Returned Reports */}
        <div
          data-aos="fade-up"
          data-aos-delay="80"
          onClick={() => navigate("/main/returned-report")}
          className={cardClasses}
        >
          <div className="w-[44px] h-[44px] rounded-xl flex items-center justify-center bg-red-600 shadow-xs shrink-0">
            <FolderSync color="white" size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-snug">
              {t("item_2")}
            </h3>
            <span className="text-sm font-bold text-red-600 dark:text-red-400">
              {dashboard_data?.returned_reports || 0} {t("count")}
            </span>
          </div>
        </div>

        {/* Accepted Reports */}
        <div
          data-aos="fade-up"
          data-aos-delay="160"
          onClick={() => navigate("/main/received-report")}
          className={cardClasses}
        >
          <div className="w-[44px] h-[44px] rounded-xl flex items-center justify-center shadow-xs bg-blue-600 shrink-0">
            <ClipboardCheck color="white" size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-snug">
              {t("item_3")}
            </h3>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {dashboard_data?.accepted_reports || 0} {t("count")}
            </span>
          </div>
        </div>

        {/* Responsible Users */}
        <div
          data-aos="fade-up"
          data-aos-delay="240"
          onClick={() => navigate("/main/responsible-representative")}
          className={cardClasses}
        >
          <div className="w-[44px] h-[44px] rounded-xl flex items-center justify-center shadow-xs bg-emerald-600 shrink-0">
            <IdCard color="white" size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-snug">
              {t("item_4")}
            </h3>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {dashboard_data?.responsible_users || 0} {t("count")}
            </span>
          </div>
        </div>

        {/* Draft reports */}
        <div
          data-aos="fade-up"
          data-aos-delay="320"
          onClick={() => navigate("/main/draft")}
          className={cardClasses}
        >
          <div className="w-[44px] h-[44px] rounded-xl flex items-center justify-center shadow-xs bg-slate-600 shrink-0">
            <PencilLine color="white" size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-snug">
              {t("item_5")}
            </h3>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {dashboard_data?.draft_reports || 0} {t("count")}
            </span>
          </div>
        </div>

        {/* Deadlines */}
        <div
          data-aos="fade-up"
          data-aos-delay="400"
          onClick={() => navigate("/main/newsletter")}
          className={cardClasses}
        >
          <div className="w-[44px] h-[44px] rounded-xl flex items-center justify-center shadow-xs bg-sky-500 shrink-0">
            <Mail color="white" size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-snug">
              {t("item_6")}
            </h3>
            <span className="text-sm font-bold text-sky-600 dark:text-sky-400">
              {dashboard_data?.deadlines || 0} {t("count")}
            </span>
          </div>
        </div>

        {/* REJA YARATISH – faqat adminlar */}
        {(user_role === "bolim_admin" || user_role === "super_admin") && (
          <div
            data-aos="fade-up"
            data-aos-delay="480"
            onClick={() => navigate("/plan/create-report")}
            className={cardClasses}
          >
            <div className="bg-purple-600 w-[44px] h-[44px] rounded-xl flex items-center justify-center shadow-xs shrink-0">
              <CalendarPlus color="white" size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-purple-700 dark:text-purple-300 leading-snug">
                {t("item_82")}
              </h3>
            </div>
          </div>
        )}

        {/* Yaratilgan Reja */}
        <div
          data-aos="fade-up"
          data-aos-delay="560"
          onClick={() => navigate("/main/created-plans")}
          className={cardClasses}
        >
          <div className="bg-orange-600 w-[44px] h-[44px] rounded-xl flex items-center justify-center shadow-xs shrink-0">
            <CalendarRange color="white" size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-snug">
              {t("item_7")}
            </h3>
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
              {dashboard_data?.plans || 0} {t("count")}
            </span>
          </div>
        </div>
      </div>

      <hr className="my-2 mx-2 border-slate-200 dark:border-slate-800" />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-4 px-2">
        <div
          data-aos="fade-up"
          data-aos-delay="560"
          onClick={() => navigate("/main/on-time")}
          className={cardClasses}
        >
          <div className="bg-emerald-600 w-[44px] h-[44px] rounded-xl flex items-center justify-center shadow-xs shrink-0">
            <CircleCheck color="white" size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-snug">
              {t("completed")}
            </h3>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {dashboard_data?.on_time_reports || 0} {t("count")}
            </span>
          </div>
        </div>

        <div
          data-aos="fade-up"
          data-aos-delay="560"
          onClick={() => navigate("/main/late")}
          className={cardClasses}
        >
          <div className="bg-amber-600 w-[44px] h-[44px] rounded-xl flex items-center justify-center shadow-xs shrink-0">
            <History color="white" size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-snug">
              {t("late")}
            </h3>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {dashboard_data?.late_reports || 0} {t("count")}
            </span>
          </div>
        </div>

        <div
          data-aos="fade-up"
          data-aos-delay="560"
          onClick={() => navigate("/main/expired-deadlines")}
          className={cardClasses}
        >
          <div className="bg-red-600 w-[44px] h-[44px] rounded-xl flex items-center justify-center shadow-xs shrink-0">
            <CircleX color="white" size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-snug">
              {t("not_completed")}
            </h3>
            <span className="text-sm font-bold text-red-600 dark:text-red-400">
              {dashboard_data?.expired_deadlines || 0} {t("count")}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default MainContainer;
