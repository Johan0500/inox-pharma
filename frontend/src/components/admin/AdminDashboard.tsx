import { useState } from "react";
import { useAuth }  from "../../contexts/AuthContext";
import {
  LayoutDashboard, MapPin, Users, Building2,
  Calendar, FileText, Package, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight,
  TrendingUp, DollarSign, MessageCircle, Shield, Lock, Target,
} from "lucide-react";
import ObjectivesTab from "./tabs/ObjectivesTab";

import OverviewTab       from "./tabs/OverviewTab";
import GPSMapTab         from "./tabs/GPSMapTab";
import DelegatesTab      from "./tabs/DelegatesTab";
import PharmaciesTab     from "./tabs/PharmaciesTab";
import PlanningTab       from "./tabs/PlanningTab";
import ReportsTab        from "./tabs/ReportsTab";
import ProductsTab       from "./tabs/ProductsTab";
import StatsTab          from "./tabs/StatsTab";
import UsersTab          from "./tabs/UsersTab";
import ChiffresTab       from "./tabs/ChiffresTab";
import StatsChiffresTab  from "./tabs/StatsChiffresTab";
import MessagesTab       from "./tabs/MessagesTab";
import LoginHistoryTab   from "./tabs/LoginHistoryTab";
import ChangePasswordModal from "../shared/ChangePasswordModal";

export default function AdminDashboard() {
  const { user, logout }        = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const TABS = [
    { id: "overview",       label: "Accueil",          icon: LayoutDashboard, roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "gps",            label: "GPS Live",         icon: MapPin,          roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "delegates",      label: "Délégués",         icon: Users,           roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "pharmacies",     label: "Pharmacies",       icon: Building2,       roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "planning",       label: "Planning",         icon: Calendar,        roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "reports",        label: "Rapports",         icon: FileText,        roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "products",       label: "Produits",         icon: Package,         roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "chiffres",       label: "Chiffres",         icon: DollarSign,      roles: ["ADMIN"] },
    { id: "stats-chiffres", label: "Stats Chiffres",   icon: TrendingUp,      roles: ["SUPER_ADMIN"] },
    { id: "stats",          label: "Statistiques",     icon: BarChart3,       roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "messages",       label: "Messagerie",       icon: MessageCircle,   roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "history",        label: "Connexions",       icon: Shield,          roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "users",          label: "Utilisateurs",     icon: Settings,        roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "objectives",     label: "Objectifs",        icon: Target,          roles: ["SUPER_ADMIN","ADMIN"] },
  ].filter((tab) => tab.roles.includes(user?.role || ""));

  const renderTab = () => {
    switch (activeTab) {
      case "overview":       return <OverviewTab />;
      case "gps":            return <GPSMapTab />;
      case "delegates":      return <DelegatesTab />;
      case "pharmacies":     return <PharmaciesTab />;
      case "planning":       return <PlanningTab />;
      case "reports":        return <ReportsTab />;
      case "products":       return <ProductsTab />;
      case "chiffres":       return <ChiffresTab />;
      case "stats-chiffres": return <StatsChiffresTab />;
      case "stats":          return <StatsTab />;
      case "messages":       return <MessagesTab />;
      case "history":        return <LoginHistoryTab />;
      case "users":          return <UsersTab />;
      case "objectives": return <ObjectivesTab />;
      default:               return <OverviewTab />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={`${collapsed ? "w-16" : "w-64"} transition-all duration-300
                        bg-gradient-to-b from-slate-900 to-slate-800
                        flex flex-col shadow-xl flex-shrink-0 relative`}>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 bg-blue-600 text-white rounded-full p-0.5 shadow-md hover:bg-blue-700 transition z-10"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo */}
        <div className={`p-4 border-b border-slate-700 ${collapsed ? "flex justify-center" : ""}`}>
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <span className="text-2xl flex-shrink-0">🏥</span>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-white text-base leading-tight">INOX PHARMA</h1>
                <p className="text-slate-400 text-xs truncate">
                  {user?.role === "SUPER_ADMIN" ? "Super Administrateur" : "Administrateur"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-sm
                ${activeTab === id
                  ? "bg-blue-600 text-white font-semibold shadow-md"
                  : "text-slate-400 hover:bg-slate-700 hover:text-white"
                }
                ${collapsed ? "justify-center" : ""}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* Utilisateur + actions */}
        <div className={`p-3 border-t border-slate-700 space-y-1 ${collapsed ? "flex flex-col items-center" : ""}`}>
          {!collapsed && (
            <div className="mb-2 px-1">
              <p className="font-medium text-white text-sm truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={() => setShowChangePwd(true)}
            title={collapsed ? "Changer le mot de passe" : undefined}
            className={`flex items-center gap-2 text-slate-400 hover:text-white text-sm px-3 py-2 rounded-xl hover:bg-slate-700 transition ${collapsed ? "justify-center w-full" : "w-full"}`}
          >
            <Lock size={16} />
            {!collapsed && "Changer mot de passe"}
          </button>
          <button
            onClick={logout}
            title={collapsed ? "Déconnexion" : undefined}
            className={`flex items-center gap-2 text-red-400 hover:text-red-300 text-sm px-3 py-2 rounded-xl hover:bg-slate-700 transition ${collapsed ? "justify-center w-full" : "w-full"}`}
          >
            <LogOut size={16} />
            {!collapsed && "Déconnexion"}
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {renderTab()}
        </div>
      </main>

      {/* Modal changement mot de passe */}
      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}
