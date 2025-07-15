import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import EmployeeCountUpdate from "./EmployeeCountUpdate";
import AllUpdate from "./AllUpdate";

function UpdateReportItem() {
  const reportIds = useSelector((state: RootState) => state.report.reportId);

  if (reportIds === "b9ad04fd-d7ff-4233-a25d-d30cf5c81ffc") {
    return <EmployeeCountUpdate />;
  } else {
    <AllUpdate />;
  }
}

export default UpdateReportItem;
