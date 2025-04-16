import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

function MainContainer() {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-3 gap-5 py-4 px-2">
      {/*  */}
      <div
        className="w-[100%] h-[100px] shadow rounded-lg flex items-center gap-5 pl-6"
        onClick={() => navigate("/main/send-report")}
      >
        <div className="bg-[#FFC445] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-[500] text-[18px] text-[#353535]">
            Jo’natilgan xisobotlar
          </h2>
          <span className="text-[#FFC445] text-[22px]">10 ta</span>
        </div>
      </div>
      {/*  */}
      <div
        className="w-[100%] h-[100px] shadow rounded-lg flex items-center gap-5 pl-6"
        onClick={() => navigate("/main/returned-report")}
      >
        <div className="bg-[#FF5445] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-[500] text-[18px] text-[#353535]">
            Qaytarilgan hisobotlar
          </h2>
          <span className="text-[#FF5445] text-[22px]">0 ta</span>
        </div>
      </div>
      {/*  */}
      <div
        onClick={() => navigate("/main/received-report")}
        className="w-[100%] h-[100px] shadow rounded-lg flex items-center gap-5 pl-6"
      >
        <div className="bg-[#4579FF] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-[500] text-[18px] text-[#353535]">
            Qabul qilingan hisobotlar
          </h2>
          <span className="text-[#4579FF] text-[22px]">0 ta</span>
        </div>
      </div>
      {/*  */}
      <div
        onClick={() => navigate("/main/responsible-representative")}
        className="w-[100%] h-[100px] shadow rounded-lg flex items-center gap-5 pl-6"
      >
        <div className="bg-[#474747] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-[500] text-[18px] text-[#353535]">
            Masu’l vakillar
          </h2>
          <span className="text-[#474747] text-[22px]">0 ta</span>
        </div>
      </div>
      {/*  */}
      <div
        onClick={() => navigate("/main/draft")}
        className="w-[100%] h-[100px] shadow rounded-lg flex items-center gap-5 pl-6"
      >
        <div className="bg-[#09B86F] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-[500] text-[18px] text-[#353535]">Qoralama</h2>
          <span className="text-[#09B86F] text-[22px]">0 ta</span>
        </div>
      </div>
      {/*  */}
      <div
        onClick={() => navigate("/main/newsletter")}
        className="w-[100%] h-[100px] shadow rounded-lg flex items-center gap-5 pl-6"
      >
        <div className="bg-[#09B86F80] w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-md">
          <FileText color="white" size={25} />
        </div>
        <div>
          <h2 className="font-[500] text-[18px] text-[#353535]">
            Habarnomalar
          </h2>
          <span className="text-[#09B86F80] text-[22px]">10 ta</span>
        </div>
      </div>
      {/*  */}
    </div>
  );
}

export default MainContainer;
