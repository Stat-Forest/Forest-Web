import { RootState } from "@/app/store";
import { useSelector } from "react-redux";
import CreateFinanceReport from "./FinanceCreate";
import AllCreateReportItem from "./AllCreate";

function CreateReportItem() {
  const reportIds = useSelector((state: RootState) => state.report.reportId);

  if (reportIds === "945d9e04-9f5a-4247-934d-5b775e15a1da") {
    return <CreateFinanceReport />;
  } else {
    return <AllCreateReportItem />;
  }
}

export default CreateReportItem;
