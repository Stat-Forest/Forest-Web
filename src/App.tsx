import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
// import Dashboard from "./view/Dashboard/Dashboard";
// import Auth from "./view/Auth/Auth";

function App() {
  return (
    <>
      <Routes>
        {/* <Route path="/auth" element={<Auth />} /> */}
        <Route
          path="/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              {/* <Dashboard /> */}
              <h1>hello world</h1>
            </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<Navigate to="/auth" replace />} />
      </Routes>
    </>
  );
}

export default App;
