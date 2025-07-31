import { useSelector } from "react-redux";
import CreateFinanceReport from "./FinanceCreate";
import FundCreate from "./FundCreate";
// import EmployeeCountCreate from "./EmployeeCountCreate";
import LandAcquisitionCreate from "./LandAcquisitionCreate";
import LeasedLandAccountCreate from "./LeasedLandAccountCreate";
import EmployeeAnalysisCreate from "./EmployeeAnalysisCreate";
import ClosedRootCreate from "./ClosedRootCreate";
import BuildForestCreate from "./BuildForestCreate";
import RodPrepareCreate from "./RodPrepareCreate";
import SeedMovementCreate from "./SeedMovementCreate";
import SuitableSeedlingsCreate from "./SutiableSeedlingsCreate";
import AllCreateReportItem from "./AllCreate";
import DefaultCreate from "./DefaultCreate";

function CreateReportItem() {
  const reportName = useSelector((state: any) => state.report.reportName);

  if (reportName === "Daromad" || reportName === "Доход") {
    return <CreateFinanceReport />;
  } else if (reportName === "Jamg'arma") {
    return <FundCreate />;
  } else if (reportName === "Xodimlar hisobi") {
    return <DefaultCreate />;
  } else if (reportName === "Yer o‘zlashtirish") {
    return <LandAcquisitionCreate />;
  } else if (reportName === "Ijaraga berilgan yerlar hisobi") {
    return <LeasedLandAccountCreate />;
  } else if (reportName === "Xodimlar hisobi taxlili") {
    return <EmployeeAnalysisCreate />;
  } else if (reportName === "Yopiq ildiz yirik hajmli") {
    return <ClosedRootCreate />;
  } else if (reportName === "O'rmon barpo qilish bo'limi") {
    return <BuildForestCreate />;
  } else if (reportName === "Qalamcha tayyorlash") {
    return <RodPrepareCreate />;
  } else if (reportName === "Urug' harakati") {
    return <SeedMovementCreate />;
  } else if (reportName === "Sotish uchun yaroqli ko‘chatlar") {
    return <SuitableSeedlingsCreate />;
  } else {
    return <AllCreateReportItem />;
  }

  // return <DefaultCreate />;
}

export default CreateReportItem;
