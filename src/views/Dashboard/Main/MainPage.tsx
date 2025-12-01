import MainContainer from "@/containers/MainContainer/MainContainer";
import { useTranslation } from "react-i18next";

function MainPage() {
  const { t } = useTranslation();
  return (
    <div className="px-3 py-4">
      {/* title */}
      <div className="pt-2 pl-2">
        <h2 className="text-xl font-[500] text-white w-[180px] text-center">
          {t("item_8")}
        </h2>
        <div className="w-full bg-[#E8E8E8] h-[3px] rounded-full">
          <div className="w-[190px] h-[3px] rounded-full bg-green-500"></div>
        </div>
      </div>

      {/* container */}
      <MainContainer />
    </div>
  );
}

export default MainPage;
