import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage      from "./components/shared/LoginPage";
import AdminDashboard from "./components/admin/AdminDashboard";
import DelegateView   from "./components/delegate/DelegateView";
import OfflineIndicator from "./components/shared/OfflineIndicator";

function AppRoutes() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") && (
        <Route path="/admin/*" element={<AdminDashboard />} />
      )}
      {user?.role === "DELEGATE" && (
        <Route path="/delegate/*" element={<DelegateView />} />
      )}
      <Route
        path="*"
        element={
          <Navigate
            to={user?.role === "DELEGATE" ? "/delegate" : "/admin"}
            replace
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
  return (
    <>
      <OfflineIndicator />
    </>
  );
}
