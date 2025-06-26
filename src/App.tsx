import { Navigate, Route, Routes } from "react-router-dom";
import Auth from "./views/Auth/Auth";
import Dashboard from "./views/Dashboard/Dashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import "./i18n";

export const user_role = import.meta.env.USER_ROLE;

function App() {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute allowedRoles={user_role}>
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
