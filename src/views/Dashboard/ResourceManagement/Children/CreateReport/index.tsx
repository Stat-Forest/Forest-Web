import { RootState } from "@/app/store";
import { useSelector } from "react-redux";
import CreateFinanceReport from "./FinanceCreate";
import AllCreateReportItem from "./AllCreate";
import FundCreate from "./FundCreate";
import EmployeeCountCreate from "./EmployeeCountCreate";
import LandAcquisitionCreate from "./LandAcquisitionCreate";
import LeasedLandAccountCreate from "./LeasedLandAccountCreate";
import EmployeeAnalysisCreate from "./EmployeeAnalysisCreate";

function CreateReportItem() {
  const reportIds = useSelector((state: RootState) => state.report.reportId);

  if (reportIds === "b293a981-2394-46d0-b959-2f4e9392e9cc") {
    return <CreateFinanceReport />;
  } else if (reportIds === "d8ee1c2f-0af0-4658-9e33-3eea672c49dc") {
    return <FundCreate />;
  } else if (reportIds === "dc385110-2447-4a89-a3b7-57b033c61007") {
    return <EmployeeCountCreate />;
  } else if (reportIds === "8e9a4650-39a2-41ff-9c47-f180acc839e5") {
    return <LandAcquisitionCreate />;
  } else if (reportIds === "b85cc419-c658-4381-9f17-d419861749a3") {
    return <LeasedLandAccountCreate />;
  } else if (reportIds === "a6c79bc4-d63f-4122-8bac-e4340e07fc60") {
    return <EmployeeAnalysisCreate />;
  } else {
    return <AllCreateReportItem />;
  }
}

export default CreateReportItem;
