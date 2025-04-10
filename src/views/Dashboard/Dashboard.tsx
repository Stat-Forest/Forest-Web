import Sidebar from "@/components/Sidebar/Sidebar";
import { Routes } from "react-router-dom";

function Dashboard() {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-[300px] bg-white overflow-x-auto fixed top-0 bottom-0 left-0 z-[99] shadow-sm">
        <Sidebar />
      </div>

      <div className="flex-1 ml-[270px] p-4 overflow-y-auto">
        <Routes></Routes>
      </div>
    </div>
  );
}

export default Dashboard;
