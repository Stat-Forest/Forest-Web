import AllUpdateReportItem from "./AllUpdate";
import PlantUpdate from "./PlantUpdate";
import InnersUpdate from "./InnersUpdate";
import { useParams } from "react-router-dom";

function UpdateReportItem() {
  const { reportName: rawReportName } = useParams();
  // Decode reportName in case it's URL encoded
  const reportName = rawReportName ? decodeURIComponent(rawReportName) : "";

  if (
    reportName === "Xuquqbuzarlik" ||
    reportName === "Og'ir mahalla" ||
    reportName === "трудный район" ||
    reportName === "Счет механизации" ||
    reportName === "Mexanizatsiya hisobi"
  ) {
    return <InnersUpdate />;
  } else if (
    reportName === "Ko'chat va Nihol" ||
    reportName === "Ko‘chat va Nihol" ||
    reportName === "Urug' xarakati Reja" ||
    reportName === "Посевной материал План" ||
    reportName === "Саженцы и саженцы" ||
    reportName === "Urug' harakati" ||
    reportName === "Питомник и Саженец Всего" ||
    reportName === "Движение семян" ||
    reportName === "Ko'chatxona va Niholxona Jami" ||
    reportName === "Shakl 8-O'X" ||
    reportName === "Форма 8-Ох" ||
    reportName === "Shakl 9-O'X" ||
    reportName === "Форма 9-Ох" ||
    reportName === "Shakl 10-O'X" ||
    reportName === "Форма 10-Ох" ||
    reportName === "Shakl 11-O'X" ||
    reportName === "Форма 11-Ох"
  ) {
    return <PlantUpdate />;
  } else {
    return <AllUpdateReportItem />;
  }
}

export default UpdateReportItem;
