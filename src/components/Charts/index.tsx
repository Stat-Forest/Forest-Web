import EmployeeAnalysisChart from "./EmployeeAnalysisChart";
import EmployeeReportChart from "./EmployeeReportChart";
import EmployeeFundChart from "./FinanceFundChart";
import EmployeeIncomeChart from "./FinanceIncomeChart";
import GolofitChart from "./GolofitChart";
import TerrasaChart from "./TerassaChart";

function ReportChartItem({
  reportName,
  activeTab,
}: {
  activeTab: string;
  reportName: string;
}) {
  if (reportName === "Daromad") {
    return <EmployeeIncomeChart activeTab={activeTab} data={"financeChart"} />;
  } else if (reportName === "Jamg'arma") {
    return <EmployeeFundChart activeTab={activeTab} />;
  } else if (reportName === "Xodimlar hisobi") {
    return <EmployeeReportChart activeTab={activeTab} />;
  } else if (reportName === "Xodimlar hisobi taxlili") {
    return <EmployeeAnalysisChart activeTab={activeTab} />;
  } else if (reportName === "Terassa") {
    return <TerrasaChart />;
  } else if (reportName === "Golofit") {
    return <GolofitChart />;
  } 
  else {
    return <div></div>;
  }
}

export default ReportChartItem;
