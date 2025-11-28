import { RootState } from "@/app/store";
import { useGetDashboardReportQuery } from "@/services/reportsApi";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

// AOS import
import AOS from "aos";
import "aos/dist/aos.css";

function MainContainer() {
  const {
    data: dashboard_data,
    isLoading,
    error,
  } = useGetDashboardReportQuery();

  const navigate = useNavigate();
  const { t } = useTranslation();
  const user_role = useSelector((state: RootState) => state.auth.user?.role);

  // AOS init
  useEffect(() => {
    AOS.init({
      duration: 700,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="loader"></div>;
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-lg text-red-500">Xatolik yuz berdi!</div>;
  }

  const cards = [
    {
      label: t("item_1"),
      color: "#FFC445",
      count: dashboard_data?.sent_reports,
      to: "/main/send-report",
    },
    {
      label: t("item_2"),
      color: "#FF5445",
      count: dashboard_data?.returned_reports,
      to: "/main/returned-report",
    },
    {
      label: t("item_3"),
      color: "#4579FF",
      count: dashboard_data?.accepted_reports,
      to: "/main/received-report",
    },
    {
      label: t("item_4"),
      color: "#474747",
      count: dashboard_data?.responsible_users,
      to: "/main/responsible-representative",
    },
    {
      label: t("item_5"),
      color: "#09B86F",
      count: dashboard_data?.draft_reports,
      to: "/main/draft",
    },
    {
      label: t("item_6"),
      color: "#09B86F80",
      count: dashboard_data?.deadlines,
      to: "/main/newsletter",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-5 py-4 px-2">
      {cards.map((item, i) => (
        <div
          key={i}
          data-aos="fade-up"
          data-aos-delay={i * 80}
          onClick={() => navigate(item.to)}
          className="w-full h-[100px] shadow rounded-lg flex items-center gap-5 pl-6 cursor-pointer 
                     hover:scale-[1.03] hover:shadow-xl hover:bg-gray-50 transition-all duration-300"
        >
          <div
            className="w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md
                       transition-all duration-300"
            style={{ background: item.color }}
          >
            <FileText color="white" size={25} />
          </div>

          <div>
            <h2 className="font-medium text-[18px] text-[#353535] transition-colors duration-300">
              {item.label}
            </h2>

            <span
              className="text-[22px] font-semibold transition-colors duration-300"
              style={{ color: item.color }}
            >
              {item.count || 0} ta
            </span>
          </div>
        </div>
      ))}

      {/* Plan yaratish (faqat adminlar uchun) */}
      {(user_role === "bolim_admin" || user_role === "super_admin") && (
        <div
          data-aos="fade-up"
          data-aos-delay={700}
          onClick={() => navigate("/plan/create-report")}
          className="w-full h-[100px] shadow rounded-lg flex items-center gap-5 pl-6 cursor-pointer
                     hover:scale-[1.03] hover:shadow-xl hover:bg-gray-50 transition-all duration-300"
        >
          <div className="bg-[purple] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
            <FileText color="white" size={25} />
          </div>

          <div>
            <h2 className="font-medium text-[18px] text-[#353535]">
              {t("item_82")}
            </h2>
          </div>
        </div>
      )}

      {/* Yaratilgan reja */}
      <div
        data-aos="fade-up"
        data-aos-delay={800}
        onClick={() => navigate("/main/created-plans")}
        className="w-full h-[100px] shadow rounded-lg flex items-center gap-5 pl-6 cursor-pointer
                   hover:scale-[1.03] hover:shadow-xl hover:bg-gray-50 transition-all duration-300"
      >
        <div className="bg-[brown] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>

        <div>
          <h2 className="font-medium text-[18px] text-[#353535]">
            {t("item_7")}
          </h2>

          <span
            className="text-[22px] font-semibold transition-colors duration-300"
            style={{ color: "brown" }}
          >
            {dashboard_data?.plans || 0} ta
          </span>
        </div>
      </div>
    </div>
  );
}

export default MainContainer;
