// import { useSelector } from "react-redux";
import AllCreateReportItem from "./AllCreate";
import InnersCreateReportItem from "./InnersCreate";
import { useParams } from "react-router-dom";
import PlantCreate from "./PlantCreate";

function CreateReportItem() {
  // const reportName = useSelector((state: any) => state.report.reportName);
  const { reportName } = useParams();

  if (reportName === "Xuquqbuzarlik") {
    return <InnersCreateReportItem />;
  } else if (reportName === "Ko‘chat va Nihol" || reportName === "Urug' xarakati Reja") {
    return <PlantCreate />;
  } else {
    return <AllCreateReportItem />;
  }
}

export default CreateReportItem;
