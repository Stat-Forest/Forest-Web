import Header from "@/components/Header/Header";
import Sidebar from "@/components/Sidebar/Sidebar";
import { routes } from "@/routes/routes";
import { Navigate, Route, Routes } from "react-router-dom";
import { Suspense } from "react";

function Dashboard() {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-[310px] bg-white overflow-x-auto fixed top-0 bottom-0 left-0 z-[99] shadow-sm">
        <Sidebar />
      </div>

      <div className="flex-1 ml-[310px] overflow-y-auto">
        <Header />
        <Suspense fallback={<div>Yuklanmoqda...</div>}>
          <Routes>
            {routes.map((item) => (
              <Route key={item.id} path={item.path} element={<item.element />}>
                {item.children?.map((child: any) => (
                  <Route
                    key={child.id}
                    path={child.path}
                    element={<child.element />}
                  />
                ))}
              </Route>
            ))}
            <Route path="*" element={<Navigate to="/main" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default Dashboard;
