import { Navigate, Route, Routes } from "react-router-dom";
// import ProtectedRoute from "./ProtectedRoute";
import Auth from "./views/Auth/Auth";
import Dashboard from "./views/Dashboard/Dashboard";

function App() {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/*"
          element={
            // <ProtectedRoute allowedRoles={["admin"]}>
              <Dashboard />
            // </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<Navigate to="/auth" replace />} />
      </Routes>
    </>
  );
}

export default App;
