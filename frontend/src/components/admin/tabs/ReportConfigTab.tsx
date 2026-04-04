import { useState, useEffect } from "react";
import {
  Mail, Clock, Users, Plus, Trash2, Send,
  CheckCircle, AlertCircle, Loader2, Bell,
  FlaskConical, Shield,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";

// ── Types ────────────────────────────────────────────────────
interface Recipient {
  id:   string;
  user: {
    id:        string;
    firstName: string;
    lastName:  string;
    email:     string;
    role:      string;
    adminLabs: { laboratory: { name: string } }[];
  };
}

interface ReportConfig {
  id:         string;
  sendHour:   number;
  sendMinute: number;
  isActive:   boolean;
  recipients: Recipient[];
}

interface AdminUser {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
  role:      string;
  adminLabs: { laboratory: { name: string } }[];
  delegate?: any;
}

// ── Composant principal ──────────────────────────────────────
export default function ReportConfigTab() {
  const qc = useQueryClient();

  const [hour,    setHour]    = useState(9);
  const [minute,  setMinute]  = useState(30);
  const [toast,   setToast]   = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Afficher un toast temporaire
  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Charger la config ──────────────────────────────────────
  const { data: config, isLoading: loadingConfig } = useQuery<ReportConfig>({
    queryKey: ["report-config"],
    queryFn:  () => api.get("/report-config").then((r) => r.data),
  });

  // ── Charger les admins disponibles ────────────────────────
  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<AdminUser[]>({
    queryKey: ["users-admin"],
    queryFn:  () => api.get("/users").then((r) =>
      r.data.filter((u: AdminUser) => ["ADMIN", "SUPER_ADMIN"].includes(u.role))
    ),
  });

  // Sync heure depuis la config
  useEffect(() => {
    if (config) {
      setHour(config.sendHour);
      setMinute(config.sendMinute);
    }
  }, [config]);

  // ── Mutation : modifier l'heure ────────────────────────────
  const mutSchedule = useMutation({
    mutationFn: () => api.patch("/report-config/schedule", { sendHour: hour, sendMinute: minute }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["report-config"] });
      showToast("success", `Rapport planifié à ${String(hour).padStart(2,"0")}h${String(minute).padStart(2,"0")}`);
    },
    onError: () => showToast("error", "Erreur lors de la mise à jour"),
  });

  // ── Mutation : ajouter un destinataire ─────────────────────
  const mutAdd = useMutation({
    mutationFn: (userId: string) => api.post("/report-config/recipients", { userId }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["report-config"] });
      showToast("success", "Destinataire ajouté");
    },
    onError: () => showToast("error", "Déjà ajouté ou erreur serveur"),
  });

  // ── Mutation : supprimer un destinataire ───────────────────
  const mutRemove = useMutation({
    mutationFn: (userId: string) => api.delete(`/report-config/recipients/${userId}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["report-config"] });
      showToast("success", "Destinataire retiré");
    },
    onError: () => showToast("error", "Erreur lors de la suppression"),
  });

  // ── Test email ─────────────────────────────────────────────
  const handleTest = async () => {
    setTesting(true);
    try {
      await api.post("/report-config/test");
      showToast("success", "Email de test envoyé ! Vérifiez vos boîtes mail.");
    } catch {
      showToast("error", "Échec de l'envoi. Vérifiez la config SMTP sur Render.");
    } finally {
      setTesting(false);
    }
  };

  // IDs déjà destinataires
  const recipientIds = new Set(config?.recipients.map((r) => r.user.id) || []);

  // Admins disponibles à ajouter (pas encore destinataires)
  const available = allUsers.filter((u) => !recipientIds.has(u.id));

  // ── Style helpers ──────────────────────────────────────────
  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: "white",
    borderRadius: 16,
    border: "1px solid #d1fae5",
    padding: 24,
    boxShadow: "0 2px 12px rgba(6,78,59,0.06)",
    ...extra,
  });

  const badge = (color: string): React.CSSProperties => ({
    background: `${color}15`,
    color,
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 20,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  });

  if (loadingConfig) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400, gap:12, color:"#064e3b" }}>
      <Loader2 size={24} style={{ animation:"spin 1s linear infinite" }} />
      <span style={{ fontSize:14 }}>Chargement de la configuration...</span>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* ── Toast ──────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: toast.type === "success" ? "#064e3b" : "#dc2626",
          color: "white", borderRadius: 12, padding: "12px 20px",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          fontSize: 14, fontWeight: 500,
          animation: "slideIn 0.3s ease",
        }}>
          {toast.type === "success"
            ? <CheckCircle size={18} />
            : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      {/* ── En-tête ─────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #064e3b 0%, #059669 100%)",
        borderRadius: 16, padding: 24, color: "white",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 20px rgba(6,78,59,0.3)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Mail size={26} />
          </div>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:700, fontFamily:"Georgia, serif" }}>
              Rapports Automatiques
            </h2>
            <p style={{ margin:"4px 0 0", fontSize:13, opacity:0.75 }}>
              Configuration des emails quotidiens aux administrateurs
            </p>
          </div>
        </div>
        <button
          onClick={handleTest}
          disabled={testing}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 12, padding: "10px 20px",
            color: "white", cursor: testing ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 13, fontWeight: 600,
            opacity: testing ? 0.7 : 1,
          }}
        >
          {testing
            ? <><Loader2 size={16} style={{ animation:"spin 1s linear infinite" }} /> Envoi...</>
            : <><Send size={16} /> Tester maintenant</>}
        </button>
      </div>

      {/* ── Ligne : Heure + Résumé ────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

        {/* Heure d'envoi */}
        <div style={card()}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:"#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Clock size={18} color="#064e3b" />
            </div>
            <div>
              <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:"#064e3b" }}>Heure d'envoi</h3>
              <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>Heure GMT — serveur Render</p>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
            {/* Heure */}
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11, color:"#6b7280", fontWeight:600, display:"block", marginBottom:6 }}>
                HEURE (0–23)
              </label>
              <input
                type="number" min={0} max={23} value={hour}
                onChange={(e) => setHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                style={{
                  width:"100%", padding:"10px 14px",
                  border:"1px solid #d1fae5", borderRadius:10,
                  fontSize:20, fontWeight:700, color:"#064e3b",
                  textAlign:"center", outline:"none",
                  boxSizing:"border-box",
                }}
              />
            </div>
            <div style={{ fontSize:28, fontWeight:700, color:"#064e3b", paddingTop:20 }}>:</div>
            {/* Minute */}
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11, color:"#6b7280", fontWeight:600, display:"block", marginBottom:6 }}>
                MINUTE (0–59)
              </label>
              <input
                type="number" min={0} max={59} value={minute}
                onChange={(e) => setMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                style={{
                  width:"100%", padding:"10px 14px",
                  border:"1px solid #d1fae5", borderRadius:10,
                  fontSize:20, fontWeight:700, color:"#064e3b",
                  textAlign:"center", outline:"none",
                  boxSizing:"border-box",
                }}
              />
            </div>
          </div>

          <div style={{
            background:"#f0fdf4", borderRadius:10, padding:"10px 14px",
            marginBottom:16, display:"flex", alignItems:"center", gap:8,
          }}>
            <Bell size={14} color="#059669" />
            <span style={{ fontSize:13, color:"#064e3b", fontWeight:600 }}>
              Envoi prévu à {String(hour).padStart(2,"0")}h{String(minute).padStart(2,"0")} GMT chaque jour
            </span>
          </div>

          <button
            onClick={() => mutSchedule.mutate()}
            disabled={mutSchedule.isPending}
            style={{
              width:"100%", padding:"11px",
              background: "linear-gradient(135deg, #064e3b, #059669)",
              border:"none", borderRadius:10, color:"white",
              fontSize:13, fontWeight:600, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              opacity: mutSchedule.isPending ? 0.7 : 1,
            }}
          >
            {mutSchedule.isPending
              ? <><Loader2 size={15} style={{ animation:"spin 1s linear infinite" }} /> Sauvegarde...</>
              : <><CheckCircle size={15} /> Enregistrer l'heure</>}
          </button>
        </div>

        {/* Résumé du fonctionnement */}
        <div style={card()}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:"#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Shield size={18} color="#064e3b" />
            </div>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:"#064e3b" }}>
              Fonctionnement
            </h3>
          </div>

          {[
            {
              icon: "🏥",
              title: "Super Administrateur",
              desc: "Reçoit un email avec les rapports de TOUS les laboratoires réunis, avec un fichier Excel par laboratoire en pièce jointe.",
            },
            {
              icon: "👤",
              title: "Administrateur",
              desc: "Reçoit uniquement le rapport de ses laboratoires assignés. Un email par laboratoire.",
            },
            {
              icon: "📊",
              title: "Contenu du rapport",
              desc: "Nom, prénom, zone et heure de connexion de chaque délégué connecté dans la journée.",
            },
            {
              icon: "⏰",
              title: "Si aucun délégué connecté",
              desc: "L'email n'est pas envoyé pour éviter les messages vides.",
            },
          ].map((item, i) => (
            <div key={i} style={{
              display:"flex", gap:12, marginBottom:14,
              paddingBottom:14,
              borderBottom: i < 3 ? "1px solid #f0fdf4" : "none",
            }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{item.icon}</span>
              <div>
                <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#064e3b" }}>{item.title}</p>
                <p style={{ margin:"2px 0 0", fontSize:12, color:"#6b7280", lineHeight:1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Destinataires actuels ────────────────────────── */}
      <div style={card()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:"#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Users size={18} color="#064e3b" />
            </div>
            <div>
              <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:"#064e3b" }}>
                Destinataires configurés
              </h3>
              <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>
                {(config?.recipients.length || 0)} destinataire(s) — emails envoyés à leur adresse de profil
              </p>
            </div>
          </div>
        </div>

        {config?.recipients.length === 0 ? (
          <div style={{
            textAlign:"center", padding:"32px 0",
            color:"#9ca3af", fontSize:13,
          }}>
            <Mail size={32} style={{ opacity:0.3, marginBottom:8 }} />
            <p style={{ margin:0 }}>Aucun destinataire configuré.</p>
            <p style={{ margin:"4px 0 0", fontSize:12 }}>Ajoutez des admins dans la section ci-dessous.</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {config?.recipients.map((r) => (
              <div key={r.id} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 16px",
                background:"#f0fdf4", borderRadius:12,
                border:"1px solid #d1fae5",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{
                    width:38, height:38, borderRadius:10,
                    background:"linear-gradient(135deg, #064e3b, #059669)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:"white", fontSize:14, fontWeight:700, flexShrink:0,
                  }}>
                    {r.user.firstName[0]}{r.user.lastName[0]}
                  </div>
                  <div>
                    <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#064e3b" }}>
                      {r.user.firstName} {r.user.lastName}
                    </p>
                    <p style={{ margin:0, fontSize:11, color:"#6b7280" }}>{r.user.email}</p>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {/* Labos assignés */}
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
                    {r.user.role === "SUPER_ADMIN" ? (
                      <span style={badge("#7c3aed")}>Tous les labos</span>
                    ) : (
                      r.user.adminLabs.map((al) => (
                        <span key={al.laboratory.name} style={badge("#059669")}>
                          <FlaskConical size={9} style={{ marginRight:3, verticalAlign:"middle" }} />
                          {al.laboratory.name}
                        </span>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => mutRemove.mutate(r.user.id)}
                    style={{
                      background:"#fee2e2", border:"none", borderRadius:8,
                      width:32, height:32, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      color:"#dc2626", flexShrink:0,
                    }}
                    title="Retirer ce destinataire"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Ajouter des destinataires ────────────────────── */}
      <div style={card()}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:"#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Plus size={18} color="#064e3b" />
          </div>
          <div>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:"#064e3b" }}>
              Ajouter des destinataires
            </h3>
            <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>
              Administrateurs disponibles non encore configurés
            </p>
          </div>
        </div>

        {loadingUsers ? (
          <div style={{ textAlign:"center", padding:"24px 0", color:"#9ca3af" }}>
            <Loader2 size={20} style={{ animation:"spin 1s linear infinite" }} />
          </div>
        ) : available.length === 0 ? (
          <div style={{
            textAlign:"center", padding:"24px 0",
            color:"#9ca3af", fontSize:13,
          }}>
            <CheckCircle size={28} style={{ opacity:0.3, marginBottom:8, color:"#059669" }} />
            <p style={{ margin:0 }}>Tous les administrateurs sont déjà destinataires.</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {available.map((u) => (
              <div key={u.id} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 16px", borderRadius:12,
                border:"1px solid #e5e7eb", background:"white",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{
                    width:38, height:38, borderRadius:10,
                    background:"#f3f4f6",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:"#6b7280", fontSize:13, fontWeight:700, flexShrink:0,
                  }}>
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  <div>
                    <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#374151" }}>
                      {u.firstName} {u.lastName}
                    </p>
                    <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{u.email}</p>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
                    {u.role === "SUPER_ADMIN" ? (
                      <span style={badge("#7c3aed")}>Super Admin</span>
                    ) : (
                      u.adminLabs.map((al) => (
                        <span key={al.laboratory.name} style={badge("#6b7280")}>
                          {al.laboratory.name}
                        </span>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => mutAdd.mutate(u.id)}
                    disabled={mutAdd.isPending}
                    style={{
                      background:"linear-gradient(135deg, #064e3b, #059669)",
                      border:"none", borderRadius:8,
                      padding:"7px 14px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:6,
                      color:"white", fontSize:12, fontWeight:600,
                      flexShrink:0,
                    }}
                  >
                    <Plus size={13} /> Ajouter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}