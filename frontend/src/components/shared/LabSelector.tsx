import { useState } from "react";
import { useAuth }  from "../../contexts/AuthContext";

const LABS = [
  { id: "lic-pharma", name: "LIC PHARMA",  emoji: "💊", color: "#065f46", light: "#d1fae5", desc: "Médicaments génériques et spécialités" },
  { id: "medisure",   name: "MEDISURE",    emoji: "🩺", color: "#1e40af", light: "#dbeafe", desc: "Solutions thérapeutiques innovantes"   },
  { id: "sigma",      name: "SIGMA",       emoji: "🔬", color: "#7c2d12", light: "#fed7aa", desc: "Recherche et développement pharma"     },
  { id: "ephaco",     name: "EPHACO",      emoji: "🏥", color: "#6b21a8", light: "#ede9fe", desc: "Produits hospitaliers et cliniques"    },
  { id: "stallion",   name: "STALLION",    emoji: "⚡", color: "#92400e", light: "#fef3c7", desc: "Performance et vitalité"              },
];

interface Props {
  onSelect: (lab: string) => void;
}

export default function LabSelector({ onSelect }: Props) {
  const { user, logout }  = useAuth();
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (labId: string) => {
    setSelected(labId);
    setTimeout(() => onSelect(labId), 400);
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 70%, #059669 100%)",
      fontFamily:"system-ui, -apple-system, sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      {/* Décors */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{
          position:"absolute", width:700, height:700, borderRadius:"50%",
          top:-300, right:-200, background:"rgba(255,255,255,0.04)",
        }}/>
        <div style={{
          position:"absolute", width:400, height:400, borderRadius:"50%",
          bottom:-150, left:-100, background:"rgba(255,255,255,0.06)",
        }}/>
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize:"80px 80px",
        }}/>
      </div>

      <div style={{ position:"relative", zIndex:1, maxWidth:900, margin:"0 auto", padding:"40px 20px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:48 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{
              width:52, height:52, borderRadius:16,
              background:"rgba(255,255,255,0.15)",
              backdropFilter:"blur(20px)",
              border:"1.5px solid rgba(255,255,255,0.25)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 8px 25px rgba(0,0,0,0.15)",
            }}>
              <span style={{ fontSize:24 }}>🏥</span>
            </div>
            <div>
              <h1 style={{
                fontFamily:"Georgia, serif",
                fontSize:20, fontWeight:700, color:"white",
                margin:0, letterSpacing:2,
              }}>
                INOX PHARMA
              </h1>
              <p style={{ color:"rgba(255,255,255,0.6)", fontSize:11, margin:0, letterSpacing:1 }}>
                SUPER ADMINISTRATEUR
              </p>
            </div>
          </div>
          <button onClick={logout} style={{
            background:"rgba(255,255,255,0.1)",
            border:"1px solid rgba(255,255,255,0.2)",
            color:"rgba(255,255,255,0.8)", borderRadius:12,
            padding:"8px 16px", cursor:"pointer", fontSize:13,
            transition:"all 0.2s",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
          >
            Déconnexion
          </button>
        </div>

        {/* Salutation */}
        <div style={{ marginBottom:40 }}>
          <p style={{ color:"rgba(255,255,255,0.7)", fontSize:14, margin:"0 0 4px", letterSpacing:1 }}>
            {greeting},
          </p>
          <h2 style={{
            fontFamily:"Georgia, serif",
            fontSize:36, fontWeight:700, color:"white",
            margin:0, lineHeight:1.2,
          }}>
            {user?.firstName} {user?.lastName}
          </h2>
          <p style={{ color:"rgba(255,255,255,0.6)", fontSize:15, marginTop:8 }}>
            Sélectionnez un laboratoire pour accéder à son tableau de bord
          </p>
        </div>

        {/* Date et heure */}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:8,
          background:"rgba(255,255,255,0.1)",
          backdropFilter:"blur(10px)",
          border:"1px solid rgba(255,255,255,0.2)",
          borderRadius:12, padding:"8px 16px", marginBottom:40,
        }}>
          <span style={{ fontSize:14 }}>📅</span>
          <span style={{ color:"white", fontSize:13 }}>
            {now.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })}
          </span>
        </div>

        {/* Grille des labos */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",
          gap:20,
        }}>
          {LABS.map((lab) => {
            const isHovered  = hovered  === lab.id;
            const isSelected = selected === lab.id;

            return (
              <button
                key={lab.id}
                onClick={() => handleSelect(lab.id)}
                onMouseEnter={() => setHovered(lab.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${lab.color}, ${lab.color}dd)`
                    : isHovered
                    ? "rgba(255,255,255,0.97)"
                    : "rgba(255,255,255,0.92)",
                  border: isSelected
                    ? `2px solid ${lab.color}`
                    : "2px solid rgba(255,255,255,0.3)",
                  borderRadius:20,
                  padding:"28px 24px",
                  cursor:"pointer", textAlign:"left",
                  transform: isHovered || isSelected ? "translateY(-4px)" : "translateY(0)",
                  boxShadow: isHovered
                    ? "0 20px 50px rgba(0,0,0,0.25)"
                    : isSelected
                    ? `0 20px 50px rgba(0,0,0,0.3), 0 0 0 4px ${lab.color}40`
                    : "0 8px 25px rgba(0,0,0,0.15)",
                  transition:"all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                {/* Icône */}
                <div style={{
                  width:56, height:56, borderRadius:16, marginBottom:16,
                  background: isSelected ? "rgba(255,255,255,0.2)" : lab.light,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow: isSelected ? "0 4px 15px rgba(0,0,0,0.2)" : `0 4px 15px ${lab.color}30`,
                }}>
                  <span style={{ fontSize:28 }}>{lab.emoji}</span>
                </div>

                {/* Nom */}
                <h3 style={{
                  fontFamily:"Georgia, serif",
                  fontSize:18, fontWeight:700, margin:"0 0 6px",
                  color: isSelected ? "white" : lab.color,
                  letterSpacing:1,
                }}>
                  {lab.name}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize:12, margin:0, lineHeight:1.5,
                  color: isSelected ? "rgba(255,255,255,0.8)" : "#6b7280",
                }}>
                  {lab.desc}
                </p>

                {/* Flèche */}
                <div style={{
                  marginTop:16, display:"flex", alignItems:"center", gap:6,
                  color: isSelected ? "rgba(255,255,255,0.9)" : lab.color,
                  fontSize:12, fontWeight:600,
                  opacity: isHovered || isSelected ? 1 : 0,
                  transform: isHovered || isSelected ? "translateX(0)" : "translateX(-8px)",
                  transition:"all 0.2s",
                }}>
                  <span>Accéder au tableau de bord</span>
                  <span>→</span>
                </div>
              </button>
            );
          })}

          {/* Bouton voir tout */}
          <button
            onClick={() => handleSelect("all")}
            onMouseEnter={() => setHovered("all")}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === "all"
                ? "rgba(255,255,255,0.97)"
                : "rgba(255,255,255,0.12)",
              border:"2px dashed rgba(255,255,255,0.4)",
              borderRadius:20, padding:"28px 24px",
              cursor:"pointer", textAlign:"left",
              transform: hovered === "all" ? "translateY(-4px)" : "translateY(0)",
              boxShadow: hovered === "all" ? "0 20px 50px rgba(0,0,0,0.25)" : "none",
              transition:"all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <div style={{
              width:56, height:56, borderRadius:16, marginBottom:16,
              background: hovered === "all" ? "#f0fdf4" : "rgba(255,255,255,0.15)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <span style={{ fontSize:28 }}>🌐</span>
            </div>
            <h3 style={{
              fontFamily:"Georgia, serif",
              fontSize:18, fontWeight:700, margin:"0 0 6px",
              color: hovered === "all" ? "#064e3b" : "white",
              letterSpacing:1,
            }}>
              VUE GLOBALE
            </h3>
            <p style={{
              fontSize:12, margin:0, lineHeight:1.5,
              color: hovered === "all" ? "#6b7280" : "rgba(255,255,255,0.6)",
            }}>
              Tous les laboratoires confondus
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
