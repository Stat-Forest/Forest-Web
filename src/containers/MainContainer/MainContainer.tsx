import { useGetDashboardReportQuery } from "@/services/reportsApi";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

function MainContainer() {
  const {
    data: dashboard_data,
    isLoading,
    error,
  } = useGetDashboardReportQuery();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="p-4 text-lg">Yuklanmoqda...</div>;
  }

  if (error) {
    return <div className="p-4 text-lg text-red-500">Xatolik yuz berdi!</div>;
  }

  console.log(dashboard_data);

  return (
    <div className="grid grid-cols-3 gap-5 py-4 px-2">
      {/* Jo’natilgan xisobotlar */}
      <div
        className="w-full h-[100px] shadow rounded-lg flex items-center gap-5 pl-6 cursor-pointer"
        onClick={() => navigate("/main/send-report")}
      >
        <div className="bg-[#FFC445] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[18px] text-[#353535]">
            Jo’natilgan xisobotlar
          </h2>
          <span className="text-[#FFC445] text-[22px]">
            {dashboard_data?.sent_reports || 0} ta
          </span>
        </div>
      </div>

      {/* Qaytarilgan hisobotlar */}
      <div
        className="w-full h-[100px] shadow rounded-lg flex items-center gap-5 pl-6 cursor-pointer"
        onClick={() => navigate("/main/returned-report")}
      >
        <div className="bg-[#FF5445] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[18px] text-[#353535]">
            Qaytarilgan hisobotlar
          </h2>
          <span className="text-[#FF5445] text-[22px]">
            {dashboard_data?.returned_reports || 0} ta
          </span>
        </div>
      </div>

      {/* Qabul qilingan hisobotlar */}
      <div
        onClick={() => navigate("/main/received-report")}
        className="w-full h-[100px] shadow rounded-lg flex items-center gap-5 pl-6 cursor-pointer"
      >
        <div className="bg-[#4579FF] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[18px] text-[#353535]">
            Qabul qilingan hisobotlar
          </h2>
          <span className="text-[#4579FF] text-[22px]">
            {dashboard_data?.accepted_reports || 0} ta
          </span>
        </div>
      </div>

      {/* Mas’ul vakillar */}
      <div
        onClick={() => navigate("/main/responsible-representative")}
        className="w-full h-[100px] shadow rounded-lg flex items-center gap-5 pl-6 cursor-pointer"
      >
        <div className="bg-[#474747] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[18px] text-[#353535]">
            Mas’ul vakillar
          </h2>
          <span className="text-[#474747] text-[22px]">
            {dashboard_data?.responsible_users || 0} ta
          </span>
        </div>
      </div>

      {/* Qoralama */}
      <div
        onClick={() => navigate("/main/draft")}
        className="w-full h-[100px] shadow rounded-lg flex items-center gap-5 pl-6 cursor-pointer"
      >
        <div className="bg-[#09B86F] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[18px] text-[#353535]">Qoralama</h2>
          <span className="text-[#09B86F] text-[22px]">
            {dashboard_data?.draft_reports || 0} ta
          </span>
        </div>
      </div>

      {/* Habarnomalar */}
      <div
        onClick={() => navigate("/main/newsletter")}
        className="w-full h-[100px] shadow rounded-lg flex items-center gap-5 pl-6 cursor-pointer"
      >
        <div className="bg-[#09B86F80] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[18px] text-[#353535]">
            Habarnomalar
          </h2>
          <span className="text-[#09B86F80] text-[22px]">
            {dashboard_data?.deadlines || 0} ta
          </span>
        </div>
      </div>
      {/* Qoralama */}
      <div
        onClick={() => navigate("/main/create-report")}
        className="w-full h-[100px] shadow rounded-lg flex items-center gap-5 pl-6 cursor-pointer"
      >
        <div className="bg-[purple] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[18px] text-[#353535]">
            Yangi reja yaratish
          </h2>
          <span className="text-[purple] text-[22px]"></span>
        </div>
      </div>

      <div
        onClick={() => navigate("/main/created-plans")}
        className="w-full h-[100px] shadow rounded-lg flex items-center gap-5 pl-6 cursor-pointer"
      >
        <div className="bg-[brown] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-medium text-[18px] text-[#353535]">
            Yaratilgan rejalar
          </h2>
          <span className="text-[brown] text-[22px]">
            {dashboard_data?.plans || 0} ta
          </span>
        </div>
      </div>
    </div>
  );
}

export default MainContainer;
