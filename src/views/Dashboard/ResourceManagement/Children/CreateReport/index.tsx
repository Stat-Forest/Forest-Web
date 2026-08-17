import AllCreateReportItem from "./AllCreate";
import InnersCreateReportItem from "./InnersCreate";
import { useParams } from "react-router-dom";
import PlantCreate from "./PlantCreate";
import { isInnersReportName, isPlantReportName } from "@/utils/i18nHelpers";

function CreateReportItem() {
  const { reportName: rawReportName } = useParams();
  const reportName = rawReportName ? decodeURIComponent(rawReportName) : "";

  if (isInnersReportName(reportName)) {
    return <InnersCreateReportItem />;
  } else if (isPlantReportName(reportName)) {
    return <PlantCreate />;
  } else {
    return <AllCreateReportItem />;
  }
}

export default CreateReportItem;

