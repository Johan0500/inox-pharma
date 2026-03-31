import { useState, useEffect } from "react";
import { useAuth }             from "../../contexts/AuthContext";
import {
  MapPin, FileText, Calendar, Package,
  LogOut, MessageCircle, Target, LayoutDashboard,
  History, BarChart3, User, Menu, X, Bell,
} from "lucide-react";
import { useQuery }      from "@tanstack/react-query";
import api               from "../../services/api";
import { setupAutoSync } from "../../services/offlineSync";

import GeoTracker     from "./GeoTracker";
import VisitReport    from "./VisitReport";
import MyPlanning     from "./MyPlanning";
import MyProducts     from "./MyProducts";
import MyMessages     from "./MyMessages";
import MyObjectives   from "./MyObjectives";
import MyDashboard    from "./MyDashboard";
import MyVisitHistory from "./MyVisitHistory";
import MyGPSHistory   from "./MyGPSHistory";
import MyStats        from "./MyStats";
import MyProfile      from "./MyProfile";

const TABS = [
  { id: "dashboard",  label: "Accueil",    icon: LayoutDashboard },
  { id: "gps",        label: "GPS",        icon: MapPin          },
  { id: "report",     label: "Rapport",    icon: FileText        },
  { id: "planning",   label: "Planning",   icon: Calendar        },
  { id: "history",    label: "Historique", icon: History         },
  { id: "messages",   label: "Messages",   icon: MessageCircle   },
  { id: "objectives", label: "Objectifs",  icon: Target          },
  { id: "stats",      label: "Stats",      icon: BarChart3       },
  { id: "products",   label: "Produits",   icon: Package         },
  { id: "profile",    label: "Profil",     icon: User            },
];

export default function DelegateView() {
  const { user, logout } = useAuth();
  const [tab,        setTab]        = useState("dashboard");
  const [syncMsg,    setSyncMsg]    = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey:        ["unread-count"],
    queryFn:         () => api.get("/messages/unread/count").then((r) => r.data.count),
    refetchInterval: 15000,
  });

  useEffect(() => {
    const cleanup = setupAutoSync((result) => {
      if (result.synced > 0) {
        setSyncMsg(`✅ ${result.synced} rapport(s) synchronisé(s)`);
        setTimeout(() => setSyncMsg(null), 4000);
      }
    });
    return cleanup;
  }, []);

  const handleTabChange = (id: string) => {
    setTab(id);
    setSidebarOpen(false);
  };

  const currentTab = TABS.find((t) => t.id === tab);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Overlay mobile ───────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 flex flex-col
        bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
        shadow-2xl transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <span className="text-lg">🏥</span>
            </div>
            <div>
              <h1 className="font-bold text-white text-sm tracking-wide">INOX PHARMA</h1>
              <p className="text-slate-400 text-xs">Délégué médical</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profil utilisateur */}
        <div className="px-4 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3 bg-slate-700/30 rounded-xl px-3 py-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-slate-400 text-xs truncate">
                {(user as any)?.delegate?.zone || "Délégué"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm relative group
                ${tab === id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold"
                  : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                }`}
            >
              <Icon size={17} className="flex-shrink-0" />
              <span>{label}</span>
              {id === "messages" && (unreadCount as number) > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {(unreadCount as number) > 9 ? "9+" : unreadCount}
                </span>
              )}
              {tab === id && (
                <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Déconnexion */}
        <div className="px-3 py-3 border-t border-slate-700/50">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-sm"
          >
            <LogOut size={17} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Zone principale ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header top */}
        <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {/* Burger mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-800 p-1"
            >
              <Menu size={22} />
            </button>
            <div>
              <h2 className="font-bold text-slate-800 text-base">
                {currentTab?.label}
              </h2>
              <p className="text-xs text-slate-400 hidden sm:block">
                {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Badge notifications */}
            <button
              onClick={() => handleTabChange("messages")}
              className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
            >
              <Bell size={20} />
              {(unreadCount as number) > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            {/* Avatar */}
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Bannière sync */}
        {syncMsg && (
          <div className="bg-green-500 text-white text-center text-xs py-2 font-medium flex-shrink-0">
            {syncMsg}
          </div>
        )}

        {/* Contenu principal */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-6xl mx-auto">
            <div style={{ display: tab === "dashboard"  ? "block" : "none" }}><MyDashboard    /></div>
            <div style={{ display: tab === "gps"        ? "block" : "none" }}><GeoTracker     /></div>
            <div style={{ display: tab === "report"     ? "block" : "none" }}><VisitReport    /></div>
            <div style={{ display: tab === "planning"   ? "block" : "none" }}><MyPlanning     /></div>
            <div style={{ display: tab === "history"    ? "block" : "none" }}><MyVisitHistory /></div>
            <div style={{ display: tab === "messages"   ? "block" : "none" }}><MyMessages     /></div>
            <div style={{ display: tab === "objectives" ? "block" : "none" }}><MyObjectives   /></div>
            <div style={{ display: tab === "stats"      ? "block" : "none" }}><MyStats        /></div>
            <div style={{ display: tab === "products"   ? "block" : "none" }}><MyProducts     /></div>
            <div style={{ display: tab === "profile"    ? "block" : "none" }}><MyProfile      /></div>
          </div>
        </main>

        {/* ── Navigation bas — mobile uniquement ───────────── */}
        <nav className="lg:hidden flex-shrink-0 bg-white border-t border-slate-200 shadow-lg overflow-x-auto">
          <div className="flex min-w-max px-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex flex-col items-center py-2 px-3 gap-0.5 text-xs transition min-w-[60px] relative
                  ${tab === id ? "text-blue-600 font-semibold" : "text-gray-400 hover:text-gray-600"}`}
              >
                <div className="relative">
                  <Icon size={20} />
                  {id === "messages" && (unreadCount as number) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                      {(unreadCount as number) > 9 ? "9+" : unreadCount}
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
    </div>
  );
}