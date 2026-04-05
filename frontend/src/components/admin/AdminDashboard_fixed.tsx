import { useState }   from "react";
import { useAuth }    from "../../contexts/AuthContext";
import {
  LayoutDashboard, MapPin, Users, Building2,
  Calendar, FileText, Package, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight,
  TrendingUp, DollarSign, MessageCircle, Shield,
  Lock, Target, Map, ArrowLeft, Mail, BookOpen,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api          from "../../services/api";

import OverviewTab        from "./tabs/OverviewTab";
import GPSMapTab          from "./tabs/GPSMapTab";
import DelegatesTab       from "./tabs/DelegatesTab";
import PharmaciesTab      from "./tabs/PharmaciesTab";
import PharmaciesMapTab   from "./tabs/PharmaciesMapTab";
import PlanningTab        from "./tabs/PlanningTab";
import ReportsTab         from "./tabs/ReportsTab";
import ProductsTab        from "./tabs/ProductsTab";
import StatsTab           from "./tabs/StatsTab";
import UsersTab           from "./tabs/UsersTab";
import ChiffresTab        from "./tabs/ChiffresTab";
import StatsChiffresTab   from "./tabs/StatsChiffresTab";
import MessagesTab        from "./tabs/MessagesTab";
import LoginHistoryTab    from "./tabs/LoginHistoryTab";
import ObjectivesTab      from "./tabs/ObjectivesTab";
import StrategieTab       from "./tabs/StrategieTab";
import EmailScheduleTab   from "./tabs/EmailScheduleTab";
import ChangePasswordModal   from "../shared/ChangePasswordModal";
import PushNotificationToggle from "../shared/PushNotificationToggle";

const LAB_COLORS: Record<string, string> = {
  "lic-pharma": "#065f46",
  "croient":    "#1e40af",
  "all":        "#064e3b",
};

const LAB_NAMES: Record<string, string> = {
  "lic-pharma": "LIC PHARMA",
  "croient":    "CROIENT",
  "all":        "VUE GLOBALE",
};

interface Props {
  selectedLab?: string | null;
  onChangeLab?: () => void;
}

export default function AdminDashboard({ selectedLab, onChangeLab }: Props) {
  const { user, logout }          = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [showPwd,   setShowPwd]   = useState(false);

  const labColor = LAB_COLORS[selectedLab || "all"] || "#064e3b";
  const labName  = LAB_NAMES[selectedLab  || "all"] || "TABLEAU DE BORD";

  const { data: unreadCount = 0 } = useQuery({
    queryKey:        ["unread-count-admin"],
    queryFn:         () => api.get("/messages/unread/count").then((r) => r.data.count),
    refetchInterval: 15000,
  });

  const TABS = [
    { id: "overview",        label: "Accueil",          icon: LayoutDashboard, roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "gps",             label: "GPS Live",         icon: MapPin,          roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "delegates",       label: "Délégués",         icon: Users,           roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "pharmacies",      label: "Pharmacies",       icon: Building2,       roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "pharmacies-map",  label: "Carte Pharmacies", icon: Map,             roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "planning",        label: "Planning",         icon: Calendar,        roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "reports",         label: "Rapports",         icon: FileText,        roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "products",        label: "Produits",         icon: Package,         roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "strategie",       label: "Stratégie",        icon: BookOpen,        roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "chiffres",        label: "Chiffres",         icon: DollarSign,      roles: ["ADMIN"]               },
    { id: "stats-chiffres",  label: "Stats Chiffres",   icon: TrendingUp,      roles: ["SUPER_ADMIN"]         },
    { id: "objectives",      label: "Objectifs",        icon: Target,          roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "stats",           label: "Statistiques",     icon: BarChart3,       roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "messages",        label: "Messagerie",       icon: MessageCircle,   roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "history",         label: "Connexions",       icon: Shield,          roles: ["SUPER_ADMIN","ADMIN"] },
    { id: "email-schedule",  label: "Email Auto",       icon: Mail,            roles: ["SUPER_ADMIN"]         },
    { id: "users",           label: "Utilisateurs",     icon: Settings,        roles: ["SUPER_ADMIN","ADMIN"] },
  ].filter((tab) => tab.roles.includes(user?.role || ""));

  const renderTab = () => {
    switch (activeTab) {
      case "overview":       return <OverviewTab />;
      case "gps":            return <GPSMapTab />;
      case "delegates":      return <DelegatesTab />;
      case "pharmacies":     return <PharmaciesTab />;
      case "pharmacies-map": return <PharmaciesMapTab />;
      case "planning":       return <PlanningTab />;
      case "reports":        return <ReportsTab />;
      case "products":       return <ProductsTab />;
      case "strategie":      return <StrategieTab />;
      case "chiffres":       return <ChiffresTab />;
      case "stats-chiffres": return <StatsChiffresTab />;
      case "objectives":     return <ObjectivesTab />;
      case "stats":          return <StatsTab />;
      case "messages":       return <MessagesTab />;
      case "history":        return <LoginHistoryTab />;
      case "email-schedule": return <EmailScheduleTab />;
      case "users":          return <UsersTab />;
      default:               return <OverviewTab />;
    }
  };

  return (
    <div style={{
      display:"flex", height:"100vh",
      background:"#f0fdf4", overflow:"hidden",
      fontFamily:"system-ui,-apple-system,sans-serif",
    }}>

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 64 : 256,
        transition: "width 0.3s ease",
        background: `linear-gradient(180deg,${labColor} 0%,${labColor}ee 100%)`,
        display: "flex", flexDirection: "column",
        boxShadow: "4px 0 30px rgba(0,0,0,0.15)",
        flexShrink: 0, position: "relative",
        overflowY: "auto", overflowX: "hidden",
      }}>

        {/* Bouton collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position:"absolute", right:-12, top:24,
            width:24, height:24, borderRadius:"50%",
            background:"white", border:`2px solid ${labColor}`,
            color:labColor, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 2px 8px rgba(0,0,0,0.15)", zIndex:10,
            fontSize:14, lineHeight:1,
          }}
        >
          {collapsed ? "›" : "‹"}
        </button>

        {/* Logo + labo */}
        <div style={{ padding:"20px 16px", borderBottom:"1px solid rgba(255,255,255,0.1)", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:40, height:40, borderRadius:12, flexShrink:0,
              background:"rgba(255,255,255,0.2)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <span style={{ fontSize:20 }}>🏥</span>
            </div>
            {!collapsed && (
              <div style={{ overflow:"hidden" }}>
                <p style={{ color:"white", fontFamily:"Georgia,serif", fontSize:14, fontWeight:700, margin:0, letterSpacing:1 }}>
                  INOX PHARMA
                </p>
                <p style={{ color:"rgba(255,255,255,0.65)", fontSize:10, margin:0, letterSpacing:1 }}>
                  {labName}
                </p>
              </div>
            )}
          </div>

          {/* Bouton changer de labo */}
          {!collapsed && user?.role === "SUPER_ADMIN" && onChangeLab && (
            <button onClick={onChangeLab} style={{
              marginTop:12, width:"100%",
              background:"rgba(255,255,255,0.15)",
              border:"1px solid rgba(255,255,255,0.25)",
              borderRadius:10, padding:"6px 10px",
              color:"rgba(255,255,255,0.85)", fontSize:11,
              cursor:"pointer", display:"flex", alignItems:"center", gap:6,
              transition:"all 0.2s",
            }}>
              <ArrowLeft size={12} />
              Changer de laboratoire
            </button>
          )}
        </div>

        {/* Notifications push */}
        {!collapsed && (
          <div style={{ padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,0.1)", flexShrink:0 }}>
            <PushNotificationToggle />
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex:1, padding:"8px", overflowY:"auto", overflowX:"hidden" }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                title={collapsed ? label : undefined}
                style={{
                  width:"100%", display:"flex", alignItems:"center",
                  gap:10, padding: collapsed ? "10px 12px" : "10px 12px",
                  borderRadius:12, border:"none", cursor:"pointer",
                  marginBottom:2, position:"relative",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: isActive ? "rgba(255,255,255,0.2)" : "transparent",
                  color: isActive ? "white" : "rgba(255,255,255,0.6)",
                  fontWeight: isActive ? 600 : 400,
                  fontSize:13,
                  boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                  transition:"all 0.15s",
                  whiteSpace:"nowrap",
                  overflow:"hidden",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ position:"relative", flexShrink:0 }}>
                  <Icon size={17} />
                  {id === "messages" && (unreadCount as number) > 0 && (
                    <span style={{
                      position:"absolute", top:-4, right:-4,
                      background:"#ef4444", color:"white",
                      fontSize:9, fontWeight:700, borderRadius:"50%",
                      width:14, height:14, display:"flex",
                      alignItems:"center", justifyContent:"center",
                    }}>
                      {(unreadCount as number) > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis" }}>{label}</span>
                )}
                {isActive && !collapsed && (
                  <div style={{
                    position:"absolute", right:0, top:"50%",
                    transform:"translateY(-50%)",
                    width:3, height:20, borderRadius:2,
                    background:"rgba(255,255,255,0.8)",
                  }}/>
                )}
              </button>
            );
          })}
        </nav>

        {/* Utilisateur + actions */}
        <div style={{
          padding:"12px 16px",
          borderTop:"1px solid rgba(255,255,255,0.1)",
          flexShrink:0,
        }}>
          {!collapsed && (
            <div style={{ marginBottom:8, padding:"8px 10px", background:"rgba(255,255,255,0.1)", borderRadius:10 }}>
              <p style={{ color:"white", fontSize:13, fontWeight:600, margin:0 }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p style={{ color:"rgba(255,255,255,0.55)", fontSize:10, margin:0 }}>{user?.email}</p>
            </div>
          )}

          <button onClick={() => setShowPwd(true)} style={{
            display:"flex", alignItems:"center", gap:8,
            background:"transparent", border:"none",
            color:"rgba(255,255,255,0.65)", cursor:"pointer",
            padding:"8px 10px", borderRadius:10, fontSize:12,
            justifyContent: collapsed ? "center" : "flex-start",
            width:"100%", transition:"all 0.15s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="white"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.65)"; }}
            title={collapsed ? "Changer mot de passe" : undefined}
          >
            <Lock size={14} />
            {!collapsed && "Changer mot de passe"}
          </button>

          <button onClick={logout} style={{
            display:"flex", alignItems:"center", gap:8,
            background:"transparent", border:"none",
            color:"rgba(255,100,100,0.8)", cursor:"pointer",
            padding:"8px 10px", borderRadius:10, fontSize:12,
            justifyContent: collapsed ? "center" : "flex-start",
            width:"100%", transition:"all 0.15s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background="rgba(255,100,100,0.15)"; e.currentTarget.style.color="#fca5a5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,100,100,0.8)"; }}
            title={collapsed ? "Déconnexion" : undefined}
          >
            <LogOut size={14} />
            {!collapsed && "Déconnexion"}
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ────────────────────────────── */}
      <main style={{ flex:1, overflowY:"auto", background:"#f0fdf4" }}>
        {/* Header */}
        <div style={{
          background:"white",
          borderBottom:"1px solid #d1fae5",
          padding:"14px 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
          position:"sticky", top:0, zIndex:10,
        }}>
          <div>
            <h2 style={{ color:"#064e3b", fontSize:17, fontWeight:700, margin:0, fontFamily:"Georgia,serif" }}>
              {TABS.find((t) => t.id === activeTab)?.label || "Tableau de bord"}
            </h2>
            <p style={{ color:"#6b7280", fontSize:11, margin:0 }}>
              {labName} — {new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" })}
            </p>
          </div>
          <div style={{
            background:"#f0fdf4", border:`1px solid ${labColor}30`,
            borderRadius:10, padding:"5px 12px",
            color:labColor, fontSize:12, fontWeight:600,
          }}>
            {user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
          </div>
        </div>

        <div style={{ padding:24 }}>
          {renderTab()}
        </div>
      </main>

      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
    </div>
  );
}
