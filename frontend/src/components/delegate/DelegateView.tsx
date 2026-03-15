// ════════════════════════════════════════════════════════════════
// FICHIER : frontend/src/components/delegate/DelegateView.tsx
// ════════════════════════════════════════════════════════════════
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { MapPin, FileText, Calendar, Package, LogOut } from "lucide-react";
import GeoTracker  from "./GeoTracker";
import VisitReport from "./VisitReport";
import MyPlanning  from "./MyPlanning";
import MyProducts  from "./MyProducts";

const TABS = [
  { id: "gps",      label: "GPS",      icon: MapPin   },
  { id: "report",   label: "Rapport",  icon: FileText },
  { id: "planning", label: "Planning", icon: Calendar },
  { id: "products", label: "Produits", icon: Package  },
];

export default function DelegateView() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("gps");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-4 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏥</span>
            <div>
              <h1 className="font-bold text-base leading-tight">INOX PHARMA</h1>
              <p className="text-xs text-slate-400">
                {user?.firstName} {user?.lastName}
                {user?.delegate?.zone && ` — ${user.delegate.zone}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.delegate?.status && user.delegate.status !== "INACTIF" && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                user.delegate.status === "EN_VISITE"      ? "bg-green-500/20 text-green-300" :
                user.delegate.status === "EN_DEPLACEMENT" ? "bg-blue-500/20 text-blue-300" :
                "bg-yellow-500/20 text-yellow-300"
              }`}>
                ● {user.delegate.status.replace(/_/g, " ")}
              </span>
            )}
            <button onClick={logout} className="text-slate-400 hover:text-white transition p-1">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto p-4">
          {tab === "gps"      && <GeoTracker />}
          {tab === "report"   && <VisitReport />}
          {tab === "planning" && <MyPlanning />}
          {tab === "products" && <MyProducts />}
        </div>
      </main>

      {/* Navigation bas */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg flex z-50">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition
              ${tab === id ? "text-blue-600 font-semibold" : "text-gray-400"}`}
          >
            <Icon size={20} />
            {label}
            {tab === id && <span className="w-1 h-1 bg-blue-600 rounded-full" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
