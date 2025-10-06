import {
  useGetEmployeeAnalysisSumQuery,
  useGetEmployeeReportSumQuery,
  useGetFinanceFundSumQuery,
  useGetIncomeSumQuery,
  useGetLandAcquisitionSumQuery,
} from "@/services/sumApi";
import { ChartNoAxesColumn } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

function EmployeeAnalysisSum({ activeTab, reportName }: any) {
  console.log(reportName);
  const { t } = useTranslation();
  
  const [sumData, setSumData] = useState<Record<string, any>>({});

  const { data: employeeAnalysisSum, isLoading: isEmployeeAnalysisLoading } =
  useGetEmployeeAnalysisSumQuery(undefined, {
    skip: reportName !== "Xodimlar hisobi taxlili",
  });

const { data: financeIncomeSum, isLoading: isFinaceIncomeLoading } =
  useGetIncomeSumQuery(undefined, {
    skip: reportName !== "Daromad",
  });

const { data: employeeReportSum, isLoading: isEmployeeReportSumLoading } =
  useGetEmployeeReportSumQuery(undefined, {
    skip: reportName !== "Xodimlar hisobi",
  });

const { data: financeFundSum, isLoading: isFinaceFundSumLoading } =
  useGetFinanceFundSumQuery(undefined, {
    skip: reportName !== "Jamg'arma",
  });

const { data: landAcquisition, isLoading: isLandAcquisitionLoading } =
  useGetLandAcquisitionSumQuery(undefined, {
    skip: reportName !== "Yer o'zlashtirish",
  });

  const isLoading =
    isEmployeeAnalysisLoading ||
    isFinaceIncomeLoading ||
    isEmployeeReportSumLoading ||
    isFinaceFundSumLoading ||
    isLandAcquisitionLoading;

  let data;
  if (reportName === "Xodimlar hisobi taxlili") {  // qilindi
    data = employeeAnalysisSum;
  } else if (reportName === "Daromad") { // qilindi
    data = financeIncomeSum;
  } else if (reportName === "Xodimlar hisobi") { // qilindi
    data = employeeReportSum;
  } else if (reportName === "Jamg'arma") { // qilindi
    data = financeFundSum;
  } else if (reportName === "Yer o'zlashtirish") { // qilindi
    data = landAcquisition;
  } else {
    data = null;
  }

  console.log(data);
  
  useEffect(() => {
    if (data) {
      let ilovaData: Record<string, any> = {};

      // massiv yoki object farqi
      if (Array.isArray(data)) {
        ilovaData = data[0]?.[activeTab] || {};
      } else {
        ilovaData = data[activeTab] || {};
      }

      console.log("Backend data:", data);
      console.log("ActiveTab:", activeTab);
      console.log("Selected ilovaData:", ilovaData);

      setSumData(ilovaData);
    }
  }, [data, activeTab]);

  // ✅ Recursive renderer
  const renderEntries = (obj: Record<string, any>) => {
    return Object.entries(obj).map(([label, value], i) => (
      <div
        key={label + i}
        className="bg-gray-100 h-[140px] rounded-xl py-6 px-4 flex flex-col justify-between"
      >
        <h3 className={`font-medium text-gray-700 ${label.length > 150 ? "text-[10px]": "text-xs"}`}>{label}</h3>
        {typeof value === "object" && value !== null ? (
          <div className="mt-2 space-y-1 overflow-y-auto max-h-[100px] pr-1">
            {renderEntries(value)} {/* recursive chaqiryapmiz */}
          </div>
        ) : (
          <h2 className="text-2xl font-bold text-gray-900">{value}</h2>
        )}
      </div>
    ));
  };

  return (
    <div className="bg-white shadow px-5 py-4 rounded-2xl mb-6">
      <div className="flex items-end gap-2 pb-3">
        <ChartNoAxesColumn color="#09B86F" fontWeight={800} />
        <h2>{t("tableSummary")}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[140px] rounded-xl bg-gray-200" />
            ))
          : renderEntries(sumData)}
      </div>
    </div>
  );
}

export default EmployeeAnalysisSum;
