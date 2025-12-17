// import { useSelector } from "react-redux";
import AllCreateReportItem from "./AllCreate";
import InnersCreateReportItem from "./InnersCreate";
import { useParams } from "react-router-dom";
import PlantCreate from "./PlantCreate";

function CreateReportItem() {
  // const reportName = useSelector((state: any) => state.report.reportName);
  const { reportName } = useParams();

  if (
    reportName === "Xuquqbuzarlik" ||
    reportName === "Og'ir mahalla" ||
    reportName === "трудный район" ||
    reportName === "Счет механизации" ||
    reportName === "Mexanizatsiya hisobi"
  ) {
    return <InnersCreateReportItem />;
  } else if (
    reportName === "Ko‘chat va Nihol" ||
    reportName === "Urug' xarakati Reja" ||
    reportName === "Посевной материал План" ||
    reportName === "Саженцы и саженцы" ||
    reportName === "Urug' harakati" ||
    reportName === "Питомник и Саженец Всего" ||
    reportName === "Движение семян" ||
    reportName === "Ko'chatxona va Niholxona Jami"
  ) {
    return <PlantCreate />;
  } else {
    return <AllCreateReportItem />;
  }
}

export default CreateReportItem;
