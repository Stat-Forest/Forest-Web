import { Navigate, Route, Routes } from "react-router-dom";
import Auth from "./views/Auth/Auth";
import Dashboard from "./views/Dashboard/Dashboard";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/*"       
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<Navigate to="/auth" replace />} />
      </Routes>
    </>
  );
}

export default App;
