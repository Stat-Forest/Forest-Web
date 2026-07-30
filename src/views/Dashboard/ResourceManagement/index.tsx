import { useParams, useNavigate } from "react-router-dom";
import ResourceContainer from "@/containers/ResourceContainer/ResourceContainer";
import { useGetStatementsReportQuery } from "@/services/reportsApi";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/app/store";
import { useEffect } from "react";
import { setReportName } from "@/features/reportSlice";
import LandDocumentsContainers from "@/containers/ResourceContainer/LandDocumentsContainers";
import ResourcePlantContainer from "@/containers/ResourceContainer/ResourcePlantContainer";
import ForestAnalysisContainer from "@/containers/ResourceContainer/ForestAnalysisContainer";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

function ResourceManagement() {
  const { id, reportName } = useParams<{ id: string; reportName: string }>();
  const lang = useSelector((state: RootState) => state.language.lang);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    data: statementData,
    isLoading,
    isError,
  } = useGetStatementsReportQuery({ lang });

  const currentItem = statementData?.find((parent: any) =>
    parent.children?.some((child: any) => child.id === id),
  );

  const parentTitle = currentItem?.name;
  const childTitle = currentItem?.children?.find(
    (child: any) => child.id === id,
  )?.name;

  useEffect(() => {
    dispatch(setReportName(reportName));
  }, [childTitle]);

  const handleBack = () => {
    if (currentItem?.id) {
      window.dispatchEvent(
        new CustomEvent("open-sidebar-submenu", {
          detail: { parentId: currentItem.id },
        })
      );
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="px-3 py-4">
      <div className="pt-2 pl-2">
        <div className="mb-3 flex items-center gap-3 px-2">
          <button
            onClick={handleBack}
            className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 text-blue-700 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all duration-200 font-semibold text-xs sm:text-sm shadow-sm cursor-pointer active:scale-95"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            <span>{t("back") || "Orqaga qaytish"}</span>
          </button>
        </div>

        <h2 className="text-xl font-[500] w-[530px] text-start px-2">
          <span className="text-[white]">
            {isLoading && (t("loading") || "Yuklanmoqda...")}
            {isError && (t("error") || "Xatolik")}
            {!isLoading && !isError && parentTitle + ": "}
          </span>
          {!isLoading && !isError && childTitle}
        </h2>
        <div className="w-full bg-[#E8E8E8] h-[4px] rounded-full">
          <div className="w-[540px] h-[4px] rounded-full bg-blue-500"></div>
        </div>
      </div>

      {childTitle == "Yer hujjatlarini kiritish" ||
      id == "05ec4fd3-6193-4211-9850-f3991be60a62" ||
      childTitle == "Ввод земельных документов" ? (
        <LandDocumentsContainers />
      ) : childTitle == "Ko‘chat va Nihol" ||
        childTitle == "Urug' xarakati Reja" ||
        childTitle == "Посевной материал План" ||
        childTitle == "Саженцы и саженцы" ||
        childTitle == "Urug' harakati" ||
        childTitle == "Питомник и Саженец Всего" ||
        childTitle == "Движение семян" ||
        childTitle == "Ko'chatxona va Niholxona Jami" ||
        childTitle == "Shakl 8-O‘X" ||
        childTitle == "Форма 8-Ох" ||
        childTitle == "Shakl 9-O‘X" ||
        childTitle == "Форма 9-Ох" ||
        childTitle == "Shakl 10-O‘X" ||
        childTitle == "Форма 10-Ох" ||
        childTitle == "Shakl 11-O‘X" ||
        childTitle == "Форма 11-Ох" ||
        childTitle == "Daromad" ? (
        <ResourcePlantContainer reportName={childTitle} />
      ) : childTitle == "O'rmonlar kesimida" ? (
        <ForestAnalysisContainer reportName={childTitle} />
      ) : (
        <ResourceContainer reportName={childTitle} />
      )}
    </div>
  );
}

export default ResourceManagement;
