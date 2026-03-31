import { useState, useEffect } from "react";
import { useAuth }             from "./contexts/AuthContext";
import SplashScreen            from "./components/shared/SplashScreen";
import LoginPage               from "./components/shared/LoginPage";
import LabSelector             from "./components/shared/LabSelector";
import AdminDashboard          from "./components/admin/AdminDashboard";
import DelegateView            from "./components/delegate/DelegateView";
import OfflineIndicator        from "./components/shared/OfflineIndicator";

export default function App() {
  const { isAuthenticated, user } = useAuth();
  const [splashDone, setSplashDone]   = useState(false);
  const [selectedLab, setSelectedLab] = useState<string | null>(null);

  // Reset lab si déconnexion
  useEffect(() => {
    if (!isAuthenticated) setSelectedLab(null);
  }, [isAuthenticated]);

  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Super Admin → sélection laboratoire d'abord
  if (user?.role === "SUPER_ADMIN" && !selectedLab) {
    return <LabSelector onSelect={setSelectedLab} />;
  }

  return (
    <>
      <OfflineIndicator />
      {user?.role === "DELEGATE"
        ? <DelegateView />
        : <AdminDashboard selectedLab={selectedLab} onChangeLab={() => setSelectedLab(null)} />
      }
    </>
  );
}
