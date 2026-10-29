import { Suspense, useEffect, lazy } from "react";
import { Navigate, Route, Routes, matchPath, useLocation, useNavigate } from "react-router-dom";
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
import { isBillingRole } from "@/features/billing/permissions";
import { isYashilRole } from "@/features/yashil/permissions";
import { YASHIL_ALLOWED_PREFIXES, YASHIL_ROUTES } from "@/features/yashil/constants";
import YashilRoute from "./Yashil/YashilRoute";

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
// Yashil mahalla (TZ §16.1 — chap menyuda alohida bo'lim)
const YashilOverview = lazy(() => import("./Yashil/Overview"));
const YashilReference = lazy(() => import("./Yashil/Reference"));
const YashilOrders = lazy(() => import("./Yashil/Orders/OrdersPage"));
const YashilOrderForm = lazy(() => import("./Yashil/Orders/OrderFormPage"));
const YashilOrderDetail = lazy(() => import("./Yashil/Orders/OrderDetailPage"));
const YashilActs = lazy(() => import("./Yashil/Acts/ActsPage"));
const YashilActDetail = lazy(() => import("./Yashil/Acts/ActDetailPage"));
const YashilWarehouse = lazy(() => import("./Yashil/Warehouse/WarehousePage"));
const YashilReports = lazy(() => import("./Yashil/Reports/ReportsPage"));
const YashilStats = lazy(() => import("./Yashil/Stats/StatsPage"));
const YashilMap = lazy(() => import("./Yashil/Map/MapPage"));
const YashilAdmin = lazy(() => import("./Yashil/Admin/AdminPage"));

const BILLING_ALLOWED_PREFIXES = ["/billing", "/support-information", "/video"];

/** Billing rollari uchun ruxsat etilgan marshrutmi (faqat ko'rish sahifalari). */
const isBillingPathAllowed = (pathname: string): boolean => {
  if (
    BILLING_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }
  // `resource-management/:id/:reportName` — ko'rish; create/update — yo'q.
  const view = matchPath("/resource-management/:id/:reportName", pathname);
  return !!view && view.params.id !== "create" && view.params.id !== "update";
};

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

  // Billing rollari (billing_user/billing_super) faqat Ijara billing, kadastr
  // hisobotlarini ko'rish (read-only) va yordam sahifalariga kira oladi
  // (qolgan API'lar backend'da 403 qaytaradi).
  const isBillingUser = isBillingRole(userRole);
  const billingUserAllowed = isBillingUser && isBillingPathAllowed(location.pathname);
  // ym_* rollari faqat «Яшил маҳалла» va yordam sahifalariga kiradi.
  const isYashilUser = isYashilRole(userRole);
  const yashilUserAllowed =
    isYashilUser &&
    YASHIL_ALLOWED_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));

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
            ) : isYashilUser && !yashilUserAllowed ? (
              <Navigate to={YASHIL_ROUTES.root} replace />
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

              {/* Yashil mahalla */}
              <Route path="yashil" element={<YashilRoute><YashilOverview /></YashilRoute>} />
              <Route path="yashil/reference" element={<YashilRoute><YashilReference /></YashilRoute>} />
              <Route path="yashil/orders" element={<YashilRoute><YashilOrders /></YashilRoute>} />
              <Route path="yashil/orders/new" element={<YashilRoute><YashilOrderForm /></YashilRoute>} />
              <Route path="yashil/orders/:id" element={<YashilRoute><YashilOrderDetail /></YashilRoute>} />
              <Route path="yashil/orders/:id/edit" element={<YashilRoute><YashilOrderForm /></YashilRoute>} />
              <Route path="yashil/acts" element={<YashilRoute><YashilActs /></YashilRoute>} />
              <Route path="yashil/acts/:id" element={<YashilRoute><YashilActDetail /></YashilRoute>} />
              <Route path="yashil/warehouse" element={<YashilRoute><YashilWarehouse /></YashilRoute>} />
              <Route path="yashil/reports" element={<YashilRoute><YashilReports /></YashilRoute>} />
              <Route path="yashil/stats" element={<YashilRoute><YashilStats /></YashilRoute>} />
              <Route path="yashil/map" element={<YashilRoute><YashilMap /></YashilRoute>} />
              <Route path="yashil/admin" element={<YashilRoute><YashilAdmin /></YashilRoute>} />

              <Route
                path="*"
                element={
                  <Navigate
                    to={
                      userRole === "support_admin"
                        ? "/support"
                        : isBillingUser
                          ? "/billing/gis"
                          : isYashilUser
                            ? YASHIL_ROUTES.root
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
