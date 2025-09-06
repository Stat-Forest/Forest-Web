// import { useSelector } from "react-redux";
import AllCreateReportItem from "./AllCreate";
import InnersCreateReportItem from "./InnersCreate";
import { useParams } from "react-router-dom";

function CreateReportItem() {
  // const reportName = useSelector((state: any) => state.report.reportName);
  const { reportName } = useParams();

  if (reportName === "Xuquqbuzarlik") {
    return <InnersCreateReportItem />;
  } else {
    return <AllCreateReportItem />;
  }
}

export default CreateReportItem;
