import EmployeeAnalysisChart from "./EmployeeAnalysisChart";
import EmployeeReportChart from "./EmployeeReportChart";
import EmployeeFundChart from "./FinanceFundChart";
import EmployeeIncomeChart from "./FinanceIncomeChart";

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
  } else if (reportName === "Yer uchastkalarini egallash") {
    return <div>Land Acquisition Chart</div>;
  } else {
    return <div></div>;
  }
}

export default ReportChartItem;
