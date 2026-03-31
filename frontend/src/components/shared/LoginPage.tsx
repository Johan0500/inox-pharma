import { useState } from "react";
import { useAuth }  from "../../contexts/AuthContext";
import api          from "../../services/api";

export default function LoginPage() {
  const { login }                   = useAuth();
  const [email,    setEmail]        = useState("");
  const [password, setPassword]     = useState("");
  const [error,    setError]        = useState("");
  const [loading,  setLoading]      = useState(false);
  const [showPwd,  setShowPwd]      = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token, res.data.user);
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === "ALREADY_CONNECTED") {
        setError("⚠️ Ce compte est déjà connecté sur un autre appareil. Déconnectez-vous d'abord.");
      } else {
        setError(err.response?.data?.error || "Email ou mot de passe incorrect.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #064e3b 0%, #065f46 35%, #047857 65%, #10b981 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, position: "relative", overflow: "hidden",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Décors arrière-plan */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{
          position:"absolute", width:600, height:600, borderRadius:"50%",
          top:-200, right:-200, background:"rgba(255,255,255,0.04)",
        }}/>
        <div style={{
          position:"absolute", width:400, height:400, borderRadius:"50%",
          bottom:-150, left:-100, background:"rgba(255,255,255,0.06)",
        }}/>
        <div style={{
          position:"absolute", width:250, height:250, borderRadius:"50%",
          top:"40%", left:"5%", background:"rgba(255,255,255,0.03)",
        }}/>
        {/* Grille décorative */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize:"60px 60px",
        }}/>
      </div>

      <div style={{ width:"100%", maxWidth:420, position:"relative", zIndex:1 }}>

        {/* Logo + titre */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{
            width:80, height:80, borderRadius:24,
            background:"rgba(255,255,255,0.15)",
            backdropFilter:"blur(20px)",
            border:"2px solid rgba(255,255,255,0.3)",
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 16px",
            boxShadow:"0 20px 50px rgba(0,0,0,0.2)",
          }}>
            <span style={{ fontSize:36 }}>🏥</span>
          </div>
          <h1 style={{
            fontFamily:"Georgia, serif",
            fontSize:28, fontWeight:700,
            color:"white", margin:0,
            letterSpacing:3, textShadow:"0 2px 20px rgba(0,0,0,0.3)",
          }}>
            INOX PHARMA
          </h1>
          <p style={{ color:"rgba(255,255,255,0.65)", fontSize:12, marginTop:6, letterSpacing:2 }}>
            GESTION PHARMACEUTIQUE
          </p>
        </div>

        {/* Carte de connexion */}
        <div style={{
          background:"rgba(255,255,255,0.97)",
          borderRadius:24, padding:36,
          boxShadow:"0 30px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.5)",
        }}>
          <h2 style={{ color:"#064e3b", fontSize:20, fontWeight:700, margin:"0 0 6px" }}>
            Connexion
          </h2>
          <p style={{ color:"#6b7280", fontSize:13, margin:"0 0 24px" }}>
            Accédez à votre espace de travail
          </p>

          {error && (
            <div style={{
              background:"#fef2f2", border:"1px solid #fecaca",
              borderRadius:12, padding:"12px 16px", marginBottom:20,
              color:"#dc2626", fontSize:13, lineHeight:1.5,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:6 }}>
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="votre@email.com"
                style={{
                  width:"100%", boxSizing:"border-box",
                  border:"1.5px solid #d1fae5",
                  borderRadius:12, padding:"12px 16px",
                  fontSize:14, outline:"none",
                  background:"#f0fdf4", color:"#111827",
                  transition:"all 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#10b981";
                  e.target.style.boxShadow   = "0 0 0 3px rgba(16,185,129,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1fae5";
                  e.target.style.boxShadow   = "none";
                }}
              />
            </div>

            {/* Mot de passe */}
            <div style={{ marginBottom:24 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:6 }}>
                Mot de passe
              </label>
              <div style={{ position:"relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    width:"100%", boxSizing:"border-box",
                    border:"1.5px solid #d1fae5",
                    borderRadius:12, padding:"12px 44px 12px 16px",
                    fontSize:14, outline:"none",
                    background:"#f0fdf4", color:"#111827",
                    transition:"all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#10b981";
                    e.target.style.boxShadow   = "0 0 0 3px rgba(16,185,129,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1fae5";
                    e.target.style.boxShadow   = "none";
                  }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                  position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
                  background:"none", border:"none", cursor:"pointer", color:"#6b7280",
                  fontSize:16, padding:0,
                }}>
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width:"100%", padding:"14px",
                background: loading ? "#6b7280" : "linear-gradient(135deg, #059669, #10b981)",
                color:"white", border:"none", borderRadius:12,
                fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 8px 25px rgba(16,185,129,0.4)",
                transition:"all 0.2s", letterSpacing:0.5,
              }}
            >
              {loading ? "Connexion en cours..." : "Se connecter →"}
            </button>
          </form>

          <div style={{
            marginTop:20, paddingTop:20,
            borderTop:"1px solid #f0fdf4",
            textAlign:"center",
          }}>
            <p style={{ color:"#9ca3af", fontSize:11 }}>
              Accès réservé aux membres INOX PHARMA
            </p>
          </div>
        </div>

        <p style={{ textAlign:"center", color:"rgba(255,255,255,0.4)", fontSize:11, marginTop:20 }}>
          INOX PHARMA © {new Date().getFullYear()} — Côte d'Ivoire
        </p>
      </div>
    </div>
  );
}
