import { useState }                              from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth }  from "../../contexts/AuthContext";
import { Plus, Trash2, X, Settings } from "lucide-react";
import api from "../../services/api";

const FIXED_LABS = [
  { id: "lic-pharma", name: "LIC PHARMA",  emoji: "💊", color: "#065f46", light: "#d1fae5", desc: "Médicaments génériques et spécialités" },
  { id: "croient",    name: "CROIENT",      emoji: "🔬", color: "#1e40af", light: "#dbeafe", desc: "Solutions thérapeutiques innovantes"  },
];

const PALETTE = [
  "#065f46","#1e40af","#7c3aed","#b91c1c","#b45309","#0e7490","#166534","#9d174d","#1d4ed8","#92400e"
];

interface Props { onSelect: (lab: string) => void; }

export default function LabSelector({ onSelect }: Props) {
  const { user, logout }      = useAuth();
  const qc                    = useQueryClient();
  const [hovered,  setHovered]  = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showManage, setShowManage] = useState(false);

  // Formulaire nouveau labo
  const [newName,  setNewName]  = useState("");
  const [newColor, setNewColor] = useState("#7c3aed");
  const [newEmoji, setNewEmoji] = useState("🏭");
  const [newDesc,  setNewDesc]  = useState("");
  const [formErr,  setFormErr]  = useState("");
  const [confirmDelLab, setConfirmDelLab] = useState<string | null>(null);

  // Charger les labos dynamiques depuis l'API
  const { data: apiLabs = [] } = useQuery({
    queryKey: ["laboratories"],
    queryFn:  () => api.get("/laboratories").then(r => r.data),
    staleTime: 30000,
  });

  // Labos dynamiques = ceux de l'API qui ne sont pas dans FIXED_LABS
  const dynamicLabs = (apiLabs as any[]).filter(
    l => !["lic-pharma","croient"].includes(l.name.toLowerCase())
  ).map(l => ({
    id:    l.name.toLowerCase(),
    name:  l.name.toUpperCase(),
    emoji: l.emoji || "🏭",
    color: l.color || "#7c3aed",
    light: l.color ? l.color + "22" : "#ede9fe",
    desc:  l.description || "Laboratoire personnalisé",
    apiId: l.id,
  }));

  const allLabs = [...FIXED_LABS, ...dynamicLabs];

  const createLabMut = useMutation({
    mutationFn: (body: any) => api.post("/laboratories/create", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["laboratories"] });
      setNewName(""); setNewColor("#7c3aed"); setNewEmoji("🏭"); setNewDesc(""); setFormErr("");
    },
    onError: (e: any) => setFormErr(e?.response?.data?.error || "Erreur lors de la création"),
  });

  const deleteLabMut = useMutation({
    mutationFn: (id: string) => api.delete(`/laboratories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["laboratories"] });
      setConfirmDelLab(null);
    },
    onError: (e: any) => alert(e?.response?.data?.error || "Impossible de supprimer ce laboratoire"),
  });

  const handleSelect = (labId: string) => {
    setSelected(labId);
    setTimeout(() => onSelect(labId), 350);
  };

  const now      = new Date();
  const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#064e3b 0%,#065f46 40%,#047857 70%,#059669 100%)", fontFamily:"system-ui,-apple-system,sans-serif", position:"relative", overflow:"hidden" }}>

      {/* Décors */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", top:-300, right:-200, background:"rgba(255,255,255,0.04)" }}/>
        <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", bottom:-150, left:-100, background:"rgba(255,255,255,0.06)" }}/>
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize:"80px 80px" }}/>
      </div>

      <div style={{ position:"relative", zIndex:1, maxWidth:900, margin:"0 auto", padding:"40px 20px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:48 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:"white", border:"2.5px solid rgba(255,255,255,0.5)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 25px rgba(0,0,0,0.2)", overflow:"hidden" }}>
              <img src="/logo.png" alt="INOX PHARMA" style={{ width:46, height:46, objectFit:"contain" }} />
            </div>
            <div>
              <h1 style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, color:"white", margin:0, letterSpacing:2 }}>INOX PHARMA</h1>
              <p style={{ color:"rgba(255,255,255,0.6)", fontSize:11, margin:0, letterSpacing:1 }}>SUPER ADMINISTRATEUR</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {/* Bouton gérer les labos */}
            <button onClick={() => setShowManage(true)} style={{
              display:"flex", alignItems:"center", gap:8,
              background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)",
              color:"rgba(255,255,255,0.9)", borderRadius:12, padding:"8px 16px",
              cursor:"pointer", fontSize:13, fontWeight:600, transition:"all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.25)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.15)"}
            >
              <Settings size={15}/> Gérer les labos
            </button>
            <button onClick={logout} style={{
              background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)",
              color:"rgba(255,255,255,0.8)", borderRadius:12, padding:"8px 16px",
              cursor:"pointer", fontSize:13, transition:"all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.1)"}
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* Salutation */}
        <div style={{ marginBottom:40 }}>
          <p style={{ color:"rgba(255,255,255,0.7)", fontSize:14, margin:"0 0 4px", letterSpacing:1 }}>{greeting},</p>
          <h2 style={{ fontFamily:"Georgia,serif", fontSize:36, fontWeight:700, color:"white", margin:0, lineHeight:1.2 }}>
            {user?.firstName} {user?.lastName}
          </h2>
          <p style={{ color:"rgba(255,255,255,0.6)", fontSize:15, marginTop:10 }}>
            Sélectionnez un laboratoire pour accéder à son tableau de bord
          </p>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.1)", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:12, padding:"8px 16px", marginTop:16 }}>
            <span style={{ fontSize:14 }}>📅</span>
            <span style={{ color:"white", fontSize:13 }}>
              {now.toLocaleDateString("fr-FR",{ weekday:"long", day:"2-digit", month:"long", year:"numeric" })}
            </span>
          </div>
        </div>

        {/* Grille des laboratoires */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:20, marginBottom:20 }}>

          {allLabs.map((lab) => {
            const isHov = hovered  === lab.id;
            const isSel = selected === lab.id;
            return (
              <button key={lab.id}
                onClick={() => handleSelect(lab.id)}
                onMouseEnter={() => setHovered(lab.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: isSel ? `linear-gradient(135deg,${lab.color},${lab.color}dd)` : isHov ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.92)",
                  border: isSel ? `2px solid ${lab.color}` : "2px solid rgba(255,255,255,0.3)",
                  borderRadius:20, padding:"28px 24px",
                  cursor:"pointer", textAlign:"left",
                  transform: isHov||isSel ? "translateY(-6px)" : "translateY(0)",
                  boxShadow: isHov ? "0 24px 60px rgba(0,0,0,0.25)" : isSel ? `0 24px 60px rgba(0,0,0,0.3),0 0 0 4px ${lab.color}40` : "0 8px 25px rgba(0,0,0,0.15)",
                  transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              >
                <div style={{ width:56, height:56, borderRadius:16, marginBottom:16, background: isSel ? "rgba(255,255,255,0.2)" : lab.light, display:"flex", alignItems:"center", justifyContent:"center", boxShadow: isSel ? "0 4px 15px rgba(0,0,0,0.2)" : `0 4px 15px ${lab.color}30` }}>
                  <span style={{ fontSize:28 }}>{lab.emoji}</span>
                </div>
                <h3 style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, margin:"0 0 6px", color: isSel ? "white" : lab.color, letterSpacing:1 }}>{lab.name}</h3>
                <p style={{ fontSize:12, margin:0, lineHeight:1.5, color: isSel ? "rgba(255,255,255,0.8)" : "#6b7280" }}>{lab.desc}</p>
                <div style={{ marginTop:16, display:"flex", alignItems:"center", gap:6, color: isSel ? "rgba(255,255,255,0.9)" : lab.color, fontSize:12, fontWeight:600, opacity: isHov||isSel ? 1 : 0, transform: isHov||isSel ? "translateX(0)" : "translateX(-8px)", transition:"all 0.2s" }}>
                  <span>Accéder au tableau de bord</span><span>→</span>
                </div>
              </button>
            );
          })}

          {/* Vue Globale */}
          <button onClick={() => handleSelect("all")} onMouseEnter={() => setHovered("all")} onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered==="all" ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.12)",
              border:"2px dashed rgba(255,255,255,0.4)", borderRadius:20, padding:"28px 24px",
              cursor:"pointer", textAlign:"left",
              transform: hovered==="all" ? "translateY(-6px)" : "translateY(0)",
              boxShadow: hovered==="all" ? "0 24px 60px rgba(0,0,0,0.25)" : "none",
              transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <div style={{ width:56, height:56, borderRadius:16, marginBottom:16, background: hovered==="all" ? "#f0fdf4" : "rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:28 }}>🌐</span>
            </div>
            <h3 style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, margin:"0 0 6px", color: hovered==="all" ? "#064e3b" : "white", letterSpacing:1 }}>VUE GLOBALE</h3>
            <p style={{ fontSize:12, margin:0, lineHeight:1.5, color: hovered==="all" ? "#6b7280" : "rgba(255,255,255,0.6)" }}>
              Voir tous les laboratoires simultanément
            </p>
            <div style={{ marginTop:16, display:"flex", alignItems:"center", gap:6, color: hovered==="all" ? "#064e3b" : "white", fontSize:12, fontWeight:600, opacity: hovered==="all" ? 1 : 0, transition:"all 0.2s" }}>
              <span>Accéder à la vue globale</span><span>→</span>
            </div>
          </button>
        </div>

        {/* Note */}
        <div style={{ background:"rgba(255,255,255,0.08)", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:16, padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:12 }}>
          <span style={{ fontSize:18, flexShrink:0 }}>ℹ️</span>
          <p style={{ color:"rgba(255,255,255,0.75)", fontSize:13, margin:0, lineHeight:1.6 }}>
            Cliquez sur <strong style={{ color:"white" }}>Gérer les labos</strong> pour ajouter ou supprimer un laboratoire. Les nouvelles données s'affichent instantanément.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MODAL GESTION DES LABORATOIRES
      ═══════════════════════════════════════════════════════ */}
      {showManage && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:20 }}>
          <div style={{ background:"white", borderRadius:24, width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 30px 80px rgba(0,0,0,0.3)" }}>

            {/* Header modal */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:"1px solid #f3f4f6", position:"sticky", top:0, background:"white", borderRadius:"24px 24px 0 0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:"#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Settings size={18} color="#059669" />
                </div>
                <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:"#111827" }}>Gestion des Laboratoires</h2>
              </div>
              <button onClick={() => setShowManage(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:4 }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ padding:24 }}>

              {/* Liste des labos existants */}
              <h3 style={{ fontSize:13, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1, margin:"0 0 12px" }}>
                Laboratoires actifs ({allLabs.length})
              </h3>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:28 }}>
                {allLabs.map(lab => {
                  const isFixed = ["lic-pharma","croient"].includes(lab.id);
                  const apiLab  = (apiLabs as any[]).find(l => l.name.toLowerCase() === lab.id);
                  return (
                    <div key={lab.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"#f9fafb", borderRadius:12, border:"1px solid #f3f4f6" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:36, height:36, borderRadius:10, background: lab.light, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{lab.emoji}</div>
                        <div>
                          <p style={{ margin:0, fontWeight:700, fontSize:14, color: lab.color }}>{lab.name}</p>
                          <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{isFixed ? "Laboratoire fixe" : "Laboratoire personnalisé"}</p>
                        </div>
                      </div>
                      {!isFixed && (
                        <button onClick={() => setConfirmDelLab(lab.id)}
                          style={{ display:"flex", alignItems:"center", gap:6, background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:10, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                          <Trash2 size={13} /> Supprimer
                        </button>
                      )}
                      {isFixed && (
                        <span style={{ fontSize:11, color:"#9ca3af", fontStyle:"italic" }}>Protégé</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Formulaire nouveau labo */}
              <div style={{ background:"#f0fdf4", borderRadius:16, padding:20, border:"1px solid #d1fae5" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                  <Plus size={16} color="#059669" />
                  <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#065f46" }}>Ajouter un nouveau laboratoire</h3>
                </div>

                {formErr && (
                  <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"8px 12px", color:"#dc2626", fontSize:12, marginBottom:12 }}>{formErr}</div>
                )}

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                  {/* Nom */}
                  <div style={{ gridColumn:"1/-1" }}>
                    <label style={{ fontSize:11, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>Nom du laboratoire *</label>
                    <input value={newName} onChange={e => setNewName(e.target.value)}
                      style={{ width:"100%", border:"1px solid #d1fae5", borderRadius:10, padding:"10px 12px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                      placeholder="Ex : PHARMADEV, MEDLAB..." />
                  </div>
                  {/* Emoji */}
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>Emoji / Icône</label>
                    <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
                      style={{ width:"100%", border:"1px solid #d1fae5", borderRadius:10, padding:"10px 12px", fontSize:20, outline:"none", textAlign:"center" }}
                      placeholder="🏭" maxLength={4} />
                  </div>
                  {/* Description */}
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>Description courte</label>
                    <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                      style={{ width:"100%", border:"1px solid #d1fae5", borderRadius:10, padding:"10px 12px", fontSize:13, outline:"none" }}
                      placeholder="Description du labo..." />
                  </div>
                  {/* Couleur */}
                  <div style={{ gridColumn:"1/-1" }}>
                    <label style={{ fontSize:11, fontWeight:700, color:"#374151", display:"block", marginBottom:8 }}>Couleur du laboratoire</label>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      {PALETTE.map(c => (
                        <button key={c} onClick={() => setNewColor(c)}
                          style={{ width:28, height:28, borderRadius:8, background:c, border: newColor===c ? "3px solid #111827" : "3px solid transparent", cursor:"pointer", transition:"all 0.15s" }} />
                      ))}
                      <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                        style={{ width:32, height:32, borderRadius:8, border:"2px solid #e5e7eb", cursor:"pointer", padding:2 }} />
                      <span style={{ fontSize:11, color:"#6b7280" }}>{newColor}</span>
                    </div>
                  </div>
                </div>

                {/* Aperçu */}
                {newName && (
                  <div style={{ display:"flex", alignItems:"center", gap:10, background:"white", borderRadius:12, padding:"10px 14px", marginBottom:12, border:`2px solid ${newColor}40` }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:newColor+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{newEmoji || "🏭"}</div>
                    <div>
                      <p style={{ margin:0, fontWeight:700, fontSize:13, color:newColor }}>{newName.toUpperCase()}</p>
                      <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{newDesc || "Laboratoire personnalisé"}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setFormErr("");
                    if (!newName.trim()) return setFormErr("Le nom est obligatoire");
                    createLabMut.mutate({ name: newName.trim(), color: newColor, emoji: newEmoji || "🏭", description: newDesc.trim() || undefined });
                  }}
                  disabled={createLabMut.isPending}
                  style={{ width:"100%", background: createLabMut.isPending ? "#9ca3af" : "#059669", color:"white", border:"none", borderRadius:12, padding:"12px", fontSize:14, fontWeight:700, cursor: createLabMut.isPending ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
                >
                  <Plus size={16} /> {createLabMut.isPending ? "Création en cours..." : "Créer le laboratoire"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation suppression labo */}
      {confirmDelLab && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }}>
          <div style={{ background:"white", borderRadius:20, padding:32, maxWidth:380, width:"100%", textAlign:"center", boxShadow:"0 30px 80px rgba(0,0,0,0.3)" }}>
            <div style={{ width:56, height:56, background:"#fef2f2", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <Trash2 size={24} color="#dc2626" />
            </div>
            <h3 style={{ margin:"0 0 8px", fontWeight:700, fontSize:18, color:"#111827" }}>Supprimer ce laboratoire ?</h3>
            <p style={{ margin:"0 0 24px", color:"#6b7280", fontSize:14, lineHeight:1.6 }}>
              Tous les produits, délégués et données associés à ce laboratoire seront affectés. Cette action est irréversible.
            </p>
            <div style={{ display:"flex", gap:12 }}>
              <button onClick={() => setConfirmDelLab(null)}
                style={{ flex:1, border:"1px solid #e5e7eb", background:"white", color:"#374151", borderRadius:12, padding:"12px", fontSize:14, fontWeight:600, cursor:"pointer" }}>
                Annuler
              </button>
              <button
                onClick={() => {
                  const apiLab = (apiLabs as any[]).find(l => l.name.toLowerCase() === confirmDelLab);
                  if (apiLab) deleteLabMut.mutate(apiLab.id);
                }}
                disabled={deleteLabMut.isPending}
                style={{ flex:1, background:"#dc2626", color:"white", border:"none", borderRadius:12, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                {deleteLabMut.isPending ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
