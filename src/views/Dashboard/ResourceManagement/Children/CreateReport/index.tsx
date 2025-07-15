import { RootState } from "@/app/store";
import { useSelector } from "react-redux";
import CreateFinanceReport from "./FinanceCreate";
import AllCreateReportItem from "./AllCreate";
import FundCreate from "./FundCreate";
import EmployeeCountCreate from "./EmployeeCountCreate";
import LandAcquisitionCreate from "./LandAcquisitionCreate";
import LeasedLandAccountCreate from "./LeasedLandAccountCreate";
import EmployeeAnalysisCreate from "./EmployeeAnalysisCreate";
import ClosedRootCreate from "./ClosedRootCreate";
import BuildForestCreate from "./BuildForestCreate";
import RodPrepareCreate from "./RodPrepareCreate";
import SeedMovementCreate from "./SeedMovementCreate";
import SuitableSeedlingsCreate from "./SutiableSeedlingsCreate";

function CreateReportItem() {
  const reportIds = useSelector((state: RootState) => state.report.reportId);

  if (reportIds === "b293a981-2394-46d0-b959-2f4e9392e9cc") {
    return <CreateFinanceReport />;
  } else if (reportIds === "d8ee1c2f-0af0-4658-9e33-3eea672c49dc") {
    return <FundCreate />;
  } else if (reportIds === "b9ad04fd-d7ff-4233-a25d-d30cf5c81ffc") {
    return <EmployeeCountCreate />;
  } else if (reportIds === "8e9a4650-39a2-41ff-9c47-f180acc839e5") {
    return <LandAcquisitionCreate />;
  } else if (reportIds === "b85cc419-c658-4381-9f17-d419861749a3") {
    return <LeasedLandAccountCreate />;
  } else if (reportIds === "85ec062e-3f6f-4f53-9465-21319fd89581") {
    return <EmployeeAnalysisCreate />;
  } else if (reportIds === "c613b0f6-6834-4c06-8c3b-19cdbf45601d") {
    return <ClosedRootCreate />;
  } else if (reportIds === "07d2286b-f7da-4bbc-a280-6cb0bc77d0ee") {
    return <BuildForestCreate />;
  } else if (reportIds === "f1327c53-c4ff-4f47-91a2-bc9749001096") {
    return <RodPrepareCreate />;
  } else if (reportIds === "26423118-409f-46a5-adcc-1fe62780e49a") {
    return <SeedMovementCreate />;
  } else if (reportIds === "9f982d1d-0000-46c8-baba-303e2ae27854") {
    return <SuitableSeedlingsCreate />;
  } else {
    return <AllCreateReportItem />;
  }
}

export default CreateReportItem;
