import { useSelector } from "react-redux";
import CreateFinanceReport from "./FinanceCreate";
import FundCreate from "./FundCreate";
import LandAcquisitionCreate from "./LandAcquisitionCreate";
import ClosedRootCreate from "./ClosedRootCreate";
import BuildForestCreate from "./BuildForestCreate";
import RodPrepareCreate from "./RodPrepareCreate";
import SeedMovementCreate from "./SeedMovementCreate";
import SuitableSeedlingsCreate from "./SutiableSeedlingsCreate";
import AllCreateReportItem from "./AllCreate";

function CreateReportItem() {
  const reportName = useSelector((state: any) => state.report.reportName);

  if (reportName === "all" || reportName === "all") {
    return <CreateFinanceReport />;
  } else if (reportName === "Jamg'arma") {
    return <FundCreate />;
  } else if (reportName === "Yer o‘zlashtirish") {
    return <LandAcquisitionCreate />;
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
