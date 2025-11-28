import { useState, useEffect } from "react";
import { Suspense } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Header from "@/components/Header/Header";
import Sidebar from "@/components/Sidebar/Sidebar";
import Main from "./Main";
import Draft from "./Main/Children/Draft";
import MainDetail from "./Main/Children/SendReport";
import ReturnedReport from "./Main/Children/ReturnedReport";
import ReceivedReport from "./Main/Children/ReceivedReport";
import ResponsibleRepresentatives from "./Main/Children/ResponsibleRepresentatives";
import Newsletters from "./Main/Children/Newsletters";
import ResourceManagement from "./ResourceManagement";
import CreateReport from "./Main/Children/CreateReport";
import ReceiptInformation from "./ReceiptInformation";
import CreateReportItem from "./ResourceManagement/Children/CreateReport";
import SupportInformation from "./SupportInfomation";
import ScrollToTop from "@/routes/ScrollToTop";
import CreatedPlans from "./Main/Children/CreatedPlans";
import UpdateReportItem from "./ResourceManagement/Children/UpdateReport";
import UpdatePlans from "./Main/Children/UpdatePlans";
import Video from "../Video";
import { useGetAnnouncementsReportsQuery } from "@/services/generalApi";
import { RootState } from "@/app/store";
import { useSelector } from "react-redux";
import AnnouncementModal from "@/components/Modals/AnnouncementModal";
import LandDocumentCreate from "./ResourceManagement/Children/CreateReport/LandDocumentCreate";

function Dashboard() {
  const lang = useSelector((state: RootState) => state.language.lang);
  const { data: announcements } = useGetAnnouncementsReportsQuery({ lang });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // 🔹 Modalni boshqarish
  useEffect(() => {
    if (announcements?.results?.length) {
      const dismissed = localStorage.getItem("announcementsSeenDate");
      const today = new Date().toISOString().split("T")[0];

      if (dismissed !== today) {
        setOpen(true);
        setCurrentIndex(0);
      }
    }
  }, [announcements]);

  // 🔹 Modal yopilganda keyingisiga o‘tish
  const handleClose = () => {
    const next = currentIndex + 1;
    if (announcements?.results && next < announcements.results.length) {
      setCurrentIndex(next);
    } else {
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem("announcementsSeenDate", today);
      setOpen(false);
    }
  };

  // 🔹 Logout bo‘lganda localStorage tozalanadi
  const handleLogout = () => {
    localStorage.removeItem("announcementsSeenDate");
    localStorage.removeItem("accessToken");
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
        <div className="w-[310px] bg-white fixed top-0 bottom-0 left-0 z-[99] shadow-sm">
          <Sidebar />
        </div>

        {/* Main content */}
        <div className="flex-1 ml-[310px] overflow-y-auto relative">
          <ScrollToTop />
          <Header onLogout={handleLogout} />

          <Suspense
            fallback={<div className="p-8 text-center">Yuklanmoqda...</div>}
          >
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
              </Route>

              <Route path="plan/create-report" element={<CreateReport />} />
              <Route path="plan-update/:id" element={<UpdatePlans />} />

              <Route
                path="resource-management/:id"
                element={<ResourceManagement />}
              />
              <Route
                path="resource-management/create/:reportName"
                element={<CreateReportItem />}
              />
              <Route
                path="resource-management/update/:id"
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
              <Route path="/land-documents-create" element={<LandDocumentCreate />} />
              <Route path="/video" element={<Video />} />

              <Route path="*" element={<Navigate to="/main" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
