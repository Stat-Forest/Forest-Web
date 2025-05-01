import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
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
// import { routes } from "@/routes/routes";

function Dashboard() {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-[310px] bg-white fixed top-0 bottom-0 left-0 z-[99] shadow-sm">
        <Sidebar />
      </div>
      <div className="flex-1 ml-[310px] overflow-y-auto">
        <Header />
        <Suspense fallback={<div>Yuklanmoqda...</div>}>
          <Routes>
            {/* {routes.map((item) => (
              <Route key={item.id} path={item.path} element={<item.element />}>
                {item.children?.map((child:any) => (
                  <Route
                    key={child.id}
                    path={child.path}
                    element={<child.element />}
                  />
                ))}
              </Route>
            ))} */}
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
            </Route>
            <Route
              path="resource-management/:id"
              element={<ResourceManagement />}
            />

            <Route path="*" element={<Navigate to="/main" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default Dashboard;
