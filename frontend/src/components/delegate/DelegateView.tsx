import { useState, useEffect }  from "react";
import { useAuth }              from "../../contexts/AuthContext";
import {
  MapPin, FileText, Calendar, Package,
  LogOut, MessageCircle, Target, LayoutDashboard,
  History, BarChart3, User,
} from "lucide-react";

import GeoTracker        from "./GeoTracker";
import VisitReport       from "./VisitReport";
import MyPlanning        from "./MyPlanning";
import MyProducts        from "./MyProducts";
import MyMessages        from "./MyMessages";
import MyObjectives      from "./MyObjectives";
import MyDashboard       from "./MyDashboard";
import MyVisitHistory    from "./MyVisitHistory";
import MyGPSHistory      from "./MyGPSHistory";
import MyStats           from "./MyStats";
import MyProfile         from "./MyProfile";
import { useQuery }      from "@tanstack/react-query";
import api               from "../../services/api";

const TABS = [
  { id: "dashboard", label: "Accueil",    icon: LayoutDashboard },
  { id: "gps",       label: "GPS",        icon: MapPin          },
  { id: "report",    label: "Rapport",    icon: FileText        },
  { id: "planning",  label: "Planning",   icon: Calendar        },
  { id: "history",   label: "Historique", icon: History         },
  { id: "messages",  label: "Messages",   icon: MessageCircle   },
  { id: "objectives",label: "Objectifs",  icon: Target          },
  { id: "stats",     label: "Stats",      icon: BarChart3       },
  { id: "products",  label: "Produits",   icon: Package         },
  { id: "profile",   label: "Profil",     icon: User            },
];

export default function DelegateView() {
  const { user, logout } = useAuth();
  const [tab, setTab]    = useState("dashboard");

  const { data: unreadCount = 0 } = useQuery({
    queryKey:       ["unread-count"],
    queryFn:        () => api.get("/messages/unread/count").then((r) => r.data.count),
    refetchInterval: 15000,
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏥</span>
            <div>
              <h1 className="font-bold text-sm leading-tight">INOX PHARMA</h1>
              <p className="text-xs text-slate-400">
                {user?.firstName} {user?.lastName}
                {user?.delegate?.zone && ` — ${user.delegate.zone}`}
              </p>
            </div>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-white transition p-1">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Contenu — TOUS les composants restent montés */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto p-4">
          <div style={{ display: tab === "dashboard"  ? "block" : "none" }}><MyDashboard   /></div>
          <div style={{ display: tab === "gps"        ? "block" : "none" }}><GeoTracker    /></div>
          <div style={{ display: tab === "report"     ? "block" : "none" }}><VisitReport   /></div>
          <div style={{ display: tab === "planning"   ? "block" : "none" }}><MyPlanning    /></div>
          <div style={{ display: tab === "history"    ? "block" : "none" }}><MyVisitHistory/></div>
          <div style={{ display: tab === "messages"   ? "block" : "none" }}><MyMessages    /></div>
          <div style={{ display: tab === "objectives" ? "block" : "none" }}><MyObjectives  /></div>
          <div style={{ display: tab === "stats"      ? "block" : "none" }}><MyStats       /></div>
          <div style={{ display: tab === "products"   ? "block" : "none" }}><MyProducts    /></div>
          <div style={{ display: tab === "profile"    ? "block" : "none" }}><MyProfile     /></div>
        </div>
      </main>

      {/* Navigation bas — scrollable */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 overflow-x-auto">
        <div className="flex min-w-max px-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center py-2 px-3 gap-0.5 text-xs transition min-w-[60px] relative
                ${tab === id ? "text-blue-600 font-semibold" : "text-gray-400"}`}
            >
              <div className="relative">
                <Icon size={20} />
                {id === "messages" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="leading-none">{label}</span>
              {tab === id && <span className="w-1 h-1 bg-blue-600 rounded-full" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}