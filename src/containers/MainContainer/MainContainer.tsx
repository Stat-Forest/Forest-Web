import { RootState } from "@/app/store";
import { useGetDashboardReportQuery } from "@/services/reportsApi";
import {
  ClipboardIcon,
  FileText,
  NotebookPen,
  NotebookText,
  Users,
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
    "w-full h-[100px] rounded-lg flex items-center gap-5 pl-6 cursor-pointer hover:scale-[1.03] hover:shadow-xl transition-all duration-300 bg-ice border-2 border-white/30";

  return (
    <div className="grid grid-cols-3 gap-5 py-4 px-2">
      {/* Sent Reports */}
      <div
        data-aos="fade-up"
        onClick={() => navigate("/main/send-report")}
        className={`${cardClasses}`}
      >
        <div className="w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md bg-yellow-500">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[22px] text-gray-800">{t("item_1")}</h2>
          <span className="text-[22px] font-semibold text-yellow-600">
            {dashboard_data?.sent_reports || 0} ta
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
        <div className="w-[50px] h-[50px] rounded-full flex items-center justify-center bg-red-600 shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[22px] text-gray-800">{t("item_2")}</h2>
          <span className="text-[22px] font-semibold text-red-700">
            {dashboard_data?.returned_reports || 0} ta
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
        <div className="w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md bg-blue-600">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[22px] text-gray-800">{t("item_3")}</h2>
          <span className="text-[22px] font-semibold text-blue-700">
            {dashboard_data?.accepted_reports || 0} ta
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
        <div className="w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md bg-gray-700">
          <Users color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[22px] text-gray-800">{t("item_4")}</h2>
          <span className="text-[22px] font-semibold text-gray-800">
            {dashboard_data?.responsible_users || 0} ta
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
        <div className="w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md bg-blue-600">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[22px] text-gray-800">{t("item_5")}</h2>
          <span className="text-[22px] font-semibold text-blue-700">
            {dashboard_data?.draft_reports || 0} ta
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
        <div className="w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md bg-blue-300">
          <ClipboardIcon color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[22px] text-gray-800">{t("item_6")}</h2>
          <span className="text-[22px] font-semibold text-blue-700">
            {dashboard_data?.deadlines || 0} ta
          </span>
        </div>
      </div>

      {/* PLAN YARATISH – faqat adminlar */}
      {(user_role === "bolim_admin" || user_role === "super_admin") && (
        <div
          data-aos="fade-up"
          data-aos-delay="480"
          onClick={() => navigate("/plan/create-report")}
          className={cardClasses}
        >
          <div className="bg-purple-600 w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
            <NotebookPen color="white" size={25} />
          </div>
          <div>
            <h2 className="font-medium text-[22px] text-gray-800">
              {t("item_82")}
            </h2>
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
        <div className="bg-orange-700 w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <NotebookText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[22px] text-gray-800">{t("item_7")}</h2>
          <span className="text-[22px] font-semibold text-orange-800">
            {dashboard_data?.plans || 0} ta
          </span>
        </div>
      </div>
    </div>
  );
}

export default MainContainer;
