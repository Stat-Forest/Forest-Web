import { useSelector } from "react-redux";
import EmployeeReportChart from "./EmployeeReportChart";
import EmployeeFundChart from "./FinanceFundChart";
import GolofitChart from "./GolofitChart";
import TerrasaChart from "./TerassaChart";
import { RootState } from "@/app/store";
import { useGetDeadlinesReportQuery } from "@/services/reportsApi";
import ZararkunandaChart from "./ZararkunandaChart";
import YerOzlashtirishChart from "./YerOzlashtirishChart";

function ReportChartItem({
  reportName,
  activeTab,
  statmentId,
}: {
  activeTab: string;
  reportName: string;
  statmentId: string;
}) {
  const lang = useSelector((state: RootState) => state.language.lang);

  const { data: deadlines, isLoading: isDeadlineLoading } =
    useGetDeadlinesReportQuery({
      statement: statmentId,
      page: 1,
      perPage: 100,
      statement__period: "",
    });

  if (isDeadlineLoading) return <div></div>;

  if (reportName === "Jamg'arma") {
    return (
      <EmployeeFundChart
        activeTab={activeTab}
        lang={lang}
        deadlines={deadlines}
      />
    );
  } else if (reportName === "Xodimlar hisobi") {
    return (
      <EmployeeReportChart
        activeTab={activeTab}
        lang={lang}
        deadlines={deadlines}
      />
    );
  } else if (reportName === "Terassa") {
    return <TerrasaChart lang={lang} deadlines={deadlines} />;
  } else if (reportName === "Golofit") {
    return <GolofitChart lang={lang} deadlines={deadlines} />;
  } else if (reportName === "Yer o‘zlashtirish") {
    return <YerOzlashtirishChart lang={lang} deadlines={deadlines} />;
  } else if (reportName === "Zararkunanda va kasalliklarga qarshi kurashish") {
    return <ZararkunandaChart lang={lang} deadlines={deadlines} />;
  } else {
    return <div></div>;
  }
}

export default ReportChartItem;
