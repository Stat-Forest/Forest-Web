import { Suspense, useEffect, lazy } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/Header/Header";
import Sidebar from "@/components/Sidebar/Sidebar";
import ScrollToTop from "@/routes/ScrollToTop";
import { useGetAnnouncementsReportsQuery } from "@/services/generalApi";
import { RootState } from "@/app/store";
import { useDispatch, useSelector } from "react-redux";
import AnnouncementModal from "@/components/Modals/AnnouncementModal";
import { setAnnouncementState } from "@/features/uiSlice";
import { getSimpleCookie, setSimpleCookie, removeCookie } from "@/utils/cookie";
import SupportChatWidget from "@/components/SupportChatWidget";
import BillingEditRoute from "./Billing/BillingEditRoute";

// Lazy loading - Dashboard route'larini alohida chunk'larga ajratish
const Main = lazy(() => import("./Main"));
const Draft = lazy(() => import("./Main/Children/Draft"));
const MainDetail = lazy(() => import("./Main/Children/SendReport"));
const ReturnedReport = lazy(() => import("./Main/Children/ReturnedReport"));
const ReceivedReport = lazy(() => import("./Main/Children/ReceivedReport"));
const ResponsibleRepresentatives = lazy(() => import("./Main/Children/ResponsibleRepresentatives"));
const Newsletters = lazy(() => import("./Main/Children/Newsletters"));
const ResourceManagement = lazy(() => import("./ResourceManagement"));
const CreateReport = lazy(() => import("./Main/Children/CreateReport"));
const ReceiptInformation = lazy(() => import("./ReceiptInformation"));
const CreateReportItem = lazy(() => import("./ResourceManagement/Children/CreateReport"));
const SupportInformation = lazy(() => import("./SupportInfomation"));
const CreatedPlans = lazy(() => import("./Main/Children/CreatedPlans"));
const UpdateReportItem = lazy(() => import("./ResourceManagement/Children/UpdateReport"));
const UpdatePlans = lazy(() => import("./Main/Children/UpdatePlans"));
const Video = lazy(() => import("../Video"));
const LandDocumentCreate = lazy(() => import("./ResourceManagement/Children/CreateReport/LandDocumentCreate"));
const OnTime = lazy(() => import("./Main/Children/OnTime"));
const Lated = lazy(() => import("./Main/Children/Lated"));
const ExpiredDeadlines = lazy(() => import("./Main/Children/ExpiredDeadlines"));
const SupportAdmin = lazy(() => import("./SupportAdmin"));
// Ijara billing (O'rmon kadastri va monitoringi → Ijara billing)
const GisMonitoring = lazy(() => import("./Billing/Gis/GisMonitoring"));
const BillingContractsPage = lazy(() => import("./Billing/Contracts/ContractsPage"));
const BillingContractCreatePage = lazy(() => import("./Billing/Contracts/ContractCreatePage"));
const BillingImportExcelPage = lazy(() => import("./Billing/Contracts/ImportExcelPage"));
const BillingContractDetailPage = lazy(() => import("./Billing/Contracts/ContractDetailPage"));

function Dashboard() {
  const dispatch = useDispatch();
  const lang = useSelector((state: RootState) => state.language.lang);
  const isOpen = useSelector((state: RootState) => state.sidebar.isOpen);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const { open, currentIndex } = useSelector(
    (state: RootState) => state.ui.announcement
  );
  const { data: announcements } = useGetAnnouncementsReportsQuery({ lang });
  const navigate = useNavigate();
  const location = useLocation();

  // billing_user faqat Ijara billing bo'limi va yordam sahifalariga kira oladi
  // (qolgan sahifalar backend'da 403 qaytaradi).
  const isBillingUser = userRole === "billing_user";
  const billingUserAllowed = ["/billing", "/support-information", "/video"].some(
    (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
  );

  // 🔹 Modalni boshqarish
  useEffect(() => {
    if (userRole === "support_admin") return;
    if (announcements?.results?.length) {
      const dismissed = getSimpleCookie("announcementsSeenDate");
      const today = new Date().toISOString().split("T")[0];

      if (dismissed !== today) {
        dispatch(
          setAnnouncementState({
            open: true,
            currentIndex: 0,
          })
        );
      }
    }
  }, [announcements, dispatch, userRole]);

  // 🔹 Modal yopilganda keyingisiga o'tish
  const handleClose = () => {
    const next = currentIndex + 1;
    if (announcements?.results && next < announcements.results.length) {
      dispatch(setAnnouncementState({ currentIndex: next }));
    } else {
      const today = new Date().toISOString().split("T")[0];
      setSimpleCookie("announcementsSeenDate", today, 1); // 1 kun muddat
      dispatch(
        setAnnouncementState({
          open: false,
          currentIndex: 0,
        })
      );
    }
  };

  // 🔹 Logout bo'lganda cookies tozalanadi
  const handleLogout = () => {
    removeCookie("announcementsSeenDate");
    navigate("/login");
  };

  const currentAnnouncement = announcements?.results?.[currentIndex];

  return (
    <>
      {/* 🔔 Har bir e'lon uchun alohida modal */}
      {open && currentAnnouncement && (
        <AnnouncementModal data={currentAnnouncement} onClose={handleClose} />
      )}

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        {isOpen && (
          <div className="w-[320px] fixed top-0 bottom-0 left-0 z-[99] shadow-sm">
            <Sidebar />
          </div>
        )}

        {/* Main content */}
        <div className={`flex-1 ${isOpen ? "ml-[320px]" : "ml-0"} overflow-y-auto relative`}>
          <ScrollToTop />
          <Header onLogout={handleLogout} />
          
          <Suspense
            fallback={<div className="p-8 text-center">Yuklanmoqda...</div>}
          >
            {isBillingUser && !billingUserAllowed ? (
              <Navigate to="/billing/gis" replace />
            ) : (
            <Routes>
              <Route path="main" element={<Main />}>
                <Route path="send-report" element={<MainDetail />} />
                <Route path="returned-report" element={<ReturnedReport />} />
                <Route path="received-report" element={<ReceivedReport />} />
                <Route
                  path="responsible-representative"
                  element={<ResponsibleRepresentatives />}
                />
                <Route path="draft" element={<Draft />} />
                <Route path="newsletter" element={<Newsletters />} />
                <Route path="created-plans" element={<CreatedPlans />} />

                <Route path="on-time" element={<OnTime />} />
                <Route path="late" element={<Lated />} />
                <Route path="expired-deadlines" element={<ExpiredDeadlines />} />
              </Route>

              <Route path="plan/create-report" element={<CreateReport />} />
              <Route path="plan-update/:id" element={<UpdatePlans />} />

              <Route
                path="resource-management/:id/:reportName"
                element={<ResourceManagement />}
              />
              <Route
                path="resource-management/create/:reportName"
                element={<CreateReportItem />}
              />
              <Route
                path="resource-management/update/:id/:reportName"
                element={<UpdateReportItem />}
              />

              <Route
                path="receipt-information"
                element={<ReceiptInformation />}
              />
              <Route
                path="support-information"
                element={<SupportInformation />}
              />
              <Route path="support" element={<SupportAdmin />} />
              <Route
                path="/land-documents-create"
                element={<LandDocumentCreate />}
              />
              <Route path="/video" element={<Video />} />

              {/* Ijara billing */}
              <Route path="billing/gis" element={<GisMonitoring />} />
              <Route path="billing/contracts" element={<BillingContractsPage />} />
              <Route
                path="billing/contracts/create"
                element={
                  <BillingEditRoute>
                    <BillingContractCreatePage />
                  </BillingEditRoute>
                }
              />
              <Route
                path="billing/contracts/upload-excel"
                element={
                  <BillingEditRoute>
                    <BillingImportExcelPage />
                  </BillingEditRoute>
                }
              />
              <Route path="billing/contracts/:id" element={<BillingContractDetailPage />} />

              <Route
                path="*"
                element={
                  <Navigate
                    to={
                      userRole === "support_admin"
                        ? "/support"
                        : userRole === "billing_user"
                          ? "/billing/gis"
                          : "/main"
                    }
                    replace
                  />
                }
              />
            </Routes>
            )}
          </Suspense>
          {userRole !== "support_admin" && <SupportChatWidget />}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
