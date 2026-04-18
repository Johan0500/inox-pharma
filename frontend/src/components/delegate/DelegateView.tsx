import { useState, useEffect } from "react";
import { useAuth }             from "../../contexts/AuthContext";
import {
  FileText, Calendar, Package,
  LogOut, MessageCircle, Target, LayoutDashboard,
  History, BarChart3, User, Lock,
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
import MyStats        from "./MyStats";
import MyProfile      from "./MyProfile";
import ChangePasswordModal from "../shared/ChangePasswordModal";
import ProfileModal        from "../shared/ProfileModal";

// GPS retiré de la navigation — il tourne en arrière-plan invisible
const TABS = [
  { id: "dashboard",  label: "Accueil",    icon: LayoutDashboard },
  { id: "report",     label: "Rapport",    icon: FileText        },
  { id: "planning",   label: "Planning",   icon: Calendar        },
  { id: "history",    label: "Historique", icon: History         },
  { id: "messages",   label: "Messages",   icon: MessageCircle   },
  { id: "objectives", label: "Objectifs",  icon: Target          },
  { id: "stats",      label: "Stats",      icon: BarChart3       },
  { id: "products",   label: "Produits",   icon: Package         },
  { id: "profile",    label: "Profil",     icon: User            },
];

const LAB_COLOR = "#065f46";

export default function DelegateView() {
  const { user, logout }  = useAuth();
  const [tab,        setTab]        = useState("dashboard");
  const [syncMsg,    setSyncMsg]    = useState<string | null>(null);
  const [collapsed,  setCollapsed]  = useState(false);
  const [showPwd,    setShowPwd]    = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleTab = (id: string) => {
    setTab(id);
    setMobileOpen(false);
  };

  const renderTab = () => {
    switch (tab) {
      case "dashboard":  return <MyDashboard    />;
      case "report":     return <VisitReport    />;
      case "planning":   return <MyPlanning     />;
      case "history":    return <MyVisitHistory />;
      case "messages":   return <MyMessages     />;
      case "objectives": return <MyObjectives   />;
      case "stats":      return <MyStats        />;
      case "products":   return <MyProducts     />;
      case "profile":    return <MyProfile      />;
      default:           return <MyDashboard    />;
    }
  };

  const currentLabel = TABS.find((t) => t.id === tab)?.label || "Accueil";

  const AvatarBubble = ({ size = 32 }: { size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: (user as any)?.avatar ? "transparent" : "rgba(255,255,255,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", border: "2px solid rgba(255,255,255,0.3)",
    }}>
      {(user as any)?.avatar
        ? <img src={(user as any).avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ color: "white", fontSize: size * 0.38, fontWeight: 700 }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
      }
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f0fdf4", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>

      {/* ── GeoTracker invisible — GPS permanent en arrière-plan ── */}
      <div style={{ display: "none" }}>
        <GeoTracker />
      </div>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
          className="lg:hidden"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: collapsed ? 64 : 240,
          transition: "width 0.3s ease",
          background: `linear-gradient(180deg, ${LAB_COLOR} 0%, ${LAB_COLOR}ee 100%)`,
          display: "flex", flexDirection: "column",
          boxShadow: "4px 0 30px rgba(0,0,0,0.15)",
          flexShrink: 0, position: "relative",
          overflowY: "auto", overflowX: "hidden",
          zIndex: 30,
        }}
        className="hidden lg:flex"
      >
        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: "absolute", right: -12, top: 24,
            width: 24, height: 24, borderRadius: "50%",
            background: "white", border: `2px solid ${LAB_COLOR}`,
            color: LAB_COLOR, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 10, fontSize: 14,
          }}
        >
          {collapsed ? "›" : "‹"}
        </button>

        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AvatarBubble size={36} />
            {!collapsed && (
              <div style={{ overflow: "hidden" }}>
                <p style={{ color: "white", fontSize: 13, fontWeight: 700, margin: 0 }}>
                  {user?.firstName} {user?.lastName}
                </p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, margin: 0 }}>Délégué médical</p>
              </div>
            )}
          </div>
          {/* Indicateur GPS actif */}
          {!collapsed && (
            <div style={{
              marginTop: 10, display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 10px",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: 600 }}>GPS actif en arrière-plan</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "8px", overflowY: "auto" }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={() => handleTab(id)}
                title={collapsed ? label : undefined}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  gap: 10, padding: "10px 12px", borderRadius: 12,
                  border: "none", cursor: "pointer", marginBottom: 2,
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: isActive ? "rgba(255,255,255,0.2)" : "transparent",
                  color: isActive ? "white" : "rgba(255,255,255,0.6)",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13, whiteSpace: "nowrap", overflow: "hidden",
                  transition: "all 0.15s", position: "relative",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Icon size={17} />
                  {id === "messages" && (unreadCount as number) > 0 && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      background: "#ef4444", color: "white",
                      fontSize: 9, fontWeight: 700, borderRadius: "50%",
                      width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {(unreadCount as number) > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
                {isActive && !collapsed && (
                  <div style={{
                    position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                    width: 3, height: 20, borderRadius: 2, background: "rgba(255,255,255,0.8)",
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
          <button onClick={() => setShowPwd(true)} title={collapsed ? "Changer mot de passe" : undefined}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none",
              color: "rgba(255,255,255,0.65)", cursor: "pointer", padding: "8px 10px", borderRadius: 10,
              fontSize: 12, justifyContent: collapsed ? "center" : "flex-start", width: "100%", transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
          >
            <Lock size={14} />{!collapsed && "Changer mot de passe"}
          </button>
          <button onClick={logout} title={collapsed ? "Déconnexion" : undefined}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none",
              color: "rgba(255,100,100,0.8)", cursor: "pointer", padding: "8px 10px", borderRadius: 10,
              fontSize: 12, justifyContent: collapsed ? "center" : "flex-start", width: "100%", transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,100,100,0.15)"; e.currentTarget.style.color = "#fca5a5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,100,100,0.8)"; }}
          >
            <LogOut size={14} />{!collapsed && "Déconnexion"}
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <main style={{ flex: 1, overflowY: "auto", background: "#f0fdf4", display: "flex", flexDirection: "column" }}>

        {/* Header sticky */}
        <div style={{
          background: "white", borderBottom: "1px solid #d1fae5",
          padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)", position: "sticky", top: 0, zIndex: 10,
        }}>
          {/* Mobile menu */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: "none", border: "none", cursor: "pointer", color: LAB_COLOR, padding: 4 }}
            className="lg:hidden"
          >
            ☰
          </button>
          <h2 style={{ color: "#064e3b", fontSize: 16, fontWeight: 700, margin: 0 }}>{currentLabel}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Badge GPS */}
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#16a34a", fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
              GPS actif
            </div>
            <button onClick={() => setShowProfile(true)} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <AvatarBubble size={32} />
            </button>
          </div>
        </div>

        {/* Notification sync */}
        {syncMsg && (
          <div style={{
            background: "#f0fdf4", borderBottom: "1px solid #d1fae5",
            padding: "8px 20px", color: "#16a34a", fontSize: 13, fontWeight: 500,
          }}>
            {syncMsg}
          </div>
        )}

        {/* Contenu */}
        <div style={{ flex: 1, padding: "20px" }}>
          {renderTab()}
        </div>
      </main>

      {/* ── Bottom nav mobile ── */}
      <nav
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "white", borderTop: "1px solid #e5e7eb",
          display: "flex", justifyContent: "space-around",
          padding: "8px 0 env(safe-area-inset-bottom)",
          zIndex: 50, boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        }}
        className="lg:hidden"
      >
        {TABS.slice(0, 5).map(({ id, label, icon: Icon }) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              onClick={() => handleTab(id)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                background: "none", border: "none", cursor: "pointer",
                padding: "4px 8px", borderRadius: 10,
                color: isActive ? LAB_COLOR : "#9ca3af",
                fontWeight: isActive ? 700 : 400,
              }}
            >
              <div style={{ position: "relative" }}>
                <Icon size={20} />
                {id === "messages" && (unreadCount as number) > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -4,
                    background: "#ef4444", color: "white",
                    fontSize: 8, fontWeight: 700, borderRadius: "50%",
                    width: 12, height: 12, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {(unreadCount as number) > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 10 }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {showPwd     && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
      {showProfile && <ProfileModal       onClose={() => setShowProfile(false)} />}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
