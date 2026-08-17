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

import {
  isPlantReportName,
  isLandDocumentsReportName,
  isForestAnalysisReportName,
} from "@/utils/i18nHelpers";

function ResourceManagement() {
  const { id, reportName } = useParams<{ id: string; reportName: string }>();
  const decodedReportName = reportName ? decodeURIComponent(reportName) : "";
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

  const effectiveReportName = childTitle || decodedReportName || "";

  useEffect(() => {
    dispatch(setReportName(effectiveReportName));
  }, [effectiveReportName, dispatch]);

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

  const isFinance =
    parentTitle === "Moliya-iqtisod va buxgalteriya hisobi" ||
    parentTitle === "Финансово-экономический и бухгалтерский учёт" ||
    parentTitle?.toLowerCase().includes("moliya") ||
    parentTitle?.toLowerCase().includes("финанс") ||
    parentTitle?.toLowerCase().includes("buxgalter") ||
    parentTitle?.toLowerCase().includes("бухгалтер") ||
    currentItem?.id === "ae359de0-328d-4c85-8da5-67731a2ec65b" ||
    childTitle === "Daromad" ||
    childTitle === "Доход" ||
    decodedReportName === "Daromad" ||
    decodedReportName === "Доход";

  return (
    <div className="px-3 py-2 space-y-4">
      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs backdrop-blur-md transition-colors flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 font-semibold text-xs sm:text-sm shadow-xs cursor-pointer active:scale-95 shrink-0"
          >
            <ArrowLeft size={16} className="text-white transition-transform group-hover:-translate-x-0.5" />
            <span>{t("back") || "Orqaga qaytish"}</span>
          </button>

          <div className="flex items-baseline gap-2 flex-wrap leading-none">
            <span className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 leading-none">
              {isLoading && (t("loading") || "Yuklanmoqda...")}
              {isError && (t("error") || "Xatolik")}
              {!isLoading && !isError && parentTitle}
            </span>
            {!isLoading && !isError && parentTitle && (
              <span className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 leading-none select-none">
                /
              </span>
            )}
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">
              {!isLoading && !isError && (childTitle || decodedReportName)}
            </span>
          </div>
        </div>
      </div>

      {isLandDocumentsReportName(childTitle || decodedReportName, id) ? (
        <LandDocumentsContainers />
      ) : isPlantReportName(childTitle) || isPlantReportName(decodedReportName) ? (
        <ResourcePlantContainer reportName={effectiveReportName} isFinance={isFinance} />
      ) : isForestAnalysisReportName(childTitle || decodedReportName) ? (
        <ForestAnalysisContainer reportName={effectiveReportName} />
      ) : (
        <ResourceContainer reportName={effectiveReportName} isFinance={isFinance} />
      )}
    </div>
  );
}

export default ResourceManagement;
