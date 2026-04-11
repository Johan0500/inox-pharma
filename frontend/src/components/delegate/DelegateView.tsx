import { useState, useEffect } from "react";
import { useAuth }             from "../../contexts/AuthContext";
import {
  MapPin, FileText, Calendar, Package,
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
      case "gps":        return <GeoTracker     />;
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

  // ── Avatar helper ─────────────────────────────────────────
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

      {/* ── Overlay mobile ───────────────────────────────── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
          className="lg:hidden"
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside
        style={{
          width: collapsed ? 64 : 256,
          transition: "width 0.3s ease",
          background: `linear-gradient(180deg, ${LAB_COLOR} 0%, ${LAB_COLOR}ee 100%)`,
          display: "flex", flexDirection: "column",
          boxShadow: "4px 0 30px rgba(0,0,0,0.15)",
          flexShrink: 0, position: "relative",
        }}
        className={`fixed lg:static inset-y-0 left-0 z-50 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Bouton collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: "absolute", right: -12, top: 24,
            width: 24, height: 24, borderRadius: "50%",
            background: "white", border: `2px solid ${LAB_COLOR}`,
            color: LAB_COLOR, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 10, fontSize: 12,
          }}
          className="hidden lg:flex"
        >
          {collapsed ? "›" : "‹"}
        </button>

        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              <span style={{ fontSize: 20 }}>🏥</span>
            </div>
            {!collapsed && (
              <div style={{ overflow: "hidden" }}>
                <p style={{ color: "white", fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 700, margin: 0, letterSpacing: 1 }}>
                  INOX PHARMA
                </p>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, margin: 0, letterSpacing: 1 }}>
                  DÉLÉGUÉ MÉDICAL
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Profil cliquable ─────────────────────────────── */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            onClick={() => setShowProfile(true)}
            style={{
              width: "100%", background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12, padding: collapsed ? "8px" : "8px 10px",
              cursor: "pointer", display: "flex", alignItems: "center",
              gap: 10, justifyContent: collapsed ? "center" : "flex-start",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            title={collapsed ? "Modifier mon profil" : undefined}
          >
            <AvatarBubble size={34} />
            {!collapsed && (
              <div style={{ overflow: "hidden", flex: 1, textAlign: "left" }}>
                <p style={{ color: "white", fontSize: 12, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.firstName} {user?.lastName}
                </p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, margin: 0 }}>
                  {(user as any)?.delegate?.zone || "Modifier mon profil"}
                </p>
              </div>
            )}
          </button>
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
                  gap: 12, padding: collapsed ? "10px" : "10px 12px",
                  borderRadius: 12, border: "none", cursor: "pointer",
                  marginBottom: 2, position: "relative",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: isActive ? "rgba(255,255,255,0.2)" : "transparent",
                  color: isActive ? "white" : "rgba(255,255,255,0.6)",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13,
                  boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                  transition: "all 0.15s",
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
                      width: 14, height: 14, display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {(unreadCount as number) > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                {!collapsed && <span>{label}</span>}
                {isActive && !collapsed && (
                  <div style={{
                    position: "absolute", right: 0, top: "50%",
                    transform: "translateY(-50%)",
                    width: 3, height: 20, borderRadius: 2,
                    background: "rgba(255,255,255,0.8)",
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bas sidebar */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button onClick={() => setShowPwd(true)} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "transparent", border: "none",
            color: "rgba(255,255,255,0.65)", cursor: "pointer",
            padding: "8px 10px", borderRadius: 10, fontSize: 12,
            justifyContent: collapsed ? "center" : "flex-start",
            width: "100%",
          }}
            title={collapsed ? "Changer mot de passe" : undefined}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
          >
            <Lock size={14} />
            {!collapsed && "Changer mot de passe"}
          </button>

          <button onClick={logout} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "transparent", border: "none",
            color: "rgba(255,100,100,0.8)", cursor: "pointer",
            padding: "8px 10px", borderRadius: 10, fontSize: 12,
            justifyContent: collapsed ? "center" : "flex-start",
            width: "100%",
          }}
            title={collapsed ? "Déconnexion" : undefined}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,100,100,0.15)"; e.currentTarget.style.color = "#fca5a5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,100,100,0.8)"; }}
          >
            <LogOut size={14} />
            {!collapsed && "Déconnexion"}
          </button>
        </div>
      </aside>

      {/* ── Zone principale ───────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          background: "white", borderBottom: "1px solid #d1fae5",
          padding: "14px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#064e3b", padding: 4 }}
            >
              ☰
            </button>
            <div>
              <h2 style={{ color: "#064e3b", fontSize: 17, fontWeight: 700, margin: 0, fontFamily: "Georgia, serif" }}>
                {currentLabel}
              </h2>
              <p style={{ color: "#6b7280", fontSize: 12, margin: 0 }}>
                {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleTab("messages")}
            style={{
              position: "relative", background: "#f0fdf4",
              border: "1px solid #d1fae5", borderRadius: 10,
              padding: "6px 12px", cursor: "pointer",
              color: LAB_COLOR, fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <MessageCircle size={15} />
            Messages
            {(unreadCount as number) > 0 && (
              <span style={{
                background: "#ef4444", color: "white",
                fontSize: 10, fontWeight: 700, borderRadius: "50%",
                width: 18, height: 18, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                {(unreadCount as number) > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Bannière sync */}
        {syncMsg && (
          <div style={{
            background: "#10b981", color: "white",
            textAlign: "center", fontSize: 12,
            padding: "8px", fontWeight: 500, flexShrink: 0,
          }}>
            {syncMsg}
          </div>
        )}

        {/* Contenu */}
        <main style={{ flex: 1, overflowY: "auto", background: "#f0fdf4" }}>
          <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
            {renderTab()}
          </div>
        </main>

        {/* Navigation bas mobile */}
        <nav className="lg:hidden" style={{
          background: "white", borderTop: "1px solid #e5e7eb",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.06)",
          overflowX: "auto", flexShrink: 0,
        }}>
          <div style={{ display: "flex", minWidth: "max-content", padding: "0 4px" }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTab(id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "8px 12px", gap: 2, fontSize: 11, minWidth: 60,
                  background: "transparent", border: "none", cursor: "pointer",
                  color: tab === id ? LAB_COLOR : "#9ca3af",
                  fontWeight: tab === id ? 600 : 400,
                  transition: "color 0.15s", position: "relative",
                }}
              >
                <div style={{ position: "relative" }}>
                  <Icon size={20} />
                  {id === "messages" && (unreadCount as number) > 0 && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      background: "#ef4444", color: "white",
                      fontSize: 9, fontWeight: 700, borderRadius: "50%",
                      width: 14, height: 14, display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {(unreadCount as number) > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span>{label}</span>
                {tab === id && (
                  <span style={{ width: 4, height: 4, background: LAB_COLOR, borderRadius: "50%" }} />
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Modals */}
      {showPwd     && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
      {showProfile && <ProfileModal       onClose={() => setShowProfile(false)} />}
    </div>
  );
}