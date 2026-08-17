import AllUpdateReportItem from "./AllUpdate";
import PlantUpdate from "./PlantUpdate";
import InnersUpdate from "./InnersUpdate";
import { useParams } from "react-router-dom";
import { isInnersReportName, isPlantReportName } from "@/utils/i18nHelpers";

function UpdateReportItem() {
  const { reportName: rawReportName } = useParams();
  const reportName = rawReportName ? decodeURIComponent(rawReportName) : "";

  if (isInnersReportName(reportName)) {
    return <InnersUpdate />;
  } else if (isPlantReportName(reportName)) {
    return <PlantUpdate />;
  } else {
    return <AllUpdateReportItem />;
  }
}

export default UpdateReportItem;

