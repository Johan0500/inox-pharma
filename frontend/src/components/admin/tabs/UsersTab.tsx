import { useState }                              from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, ToggleLeft, ToggleRight, X, LogOut, Camera } from "lucide-react";
import api         from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";

const LABS = ["lic-pharma", "croient"];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN:       "Administrateur",
  DELEGATE:    "Délégué",
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  SUPER_ADMIN: { bg: "#fee2e2", text: "#dc2626" },
  ADMIN:       { bg: "#f3e8ff", text: "#7c3aed" },
  DELEGATE:    { bg: "#dbeafe", text: "#2563eb" },
};

const s = {
  input: {
    width: "100%", padding: "10px 14px", border: "1px solid #d1d5db",
    borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" as const,
  },
  label: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block",
    marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 },
};

export default function UsersTab() {
  const { user } = useAuth();
  const qc       = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    email: "", password: "", firstName: "", lastName: "",
    role: "DELEGATE", labs: ["lic-pharma"], zone: "", phone: "",
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn:  () => api.get("/users").then(r => r.data),
  });

  const createUser = useMutation({
    mutationFn: (data: any) => api.post("/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setShowForm(false);
      setFormError("");
      setForm({ email:"", password:"", firstName:"", lastName:"", role:"DELEGATE", labs:["lic-pharma"], zone:"", phone:"" });
    },
    onError: (err: any) => setFormError(err.response?.data?.error || "Erreur"),
  });

  const toggleUser = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/toggle`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const disconnectUser = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}/session`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const disconnectAll = useMutation({
    mutationFn: () => api.delete("/users/sessions/all"),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.email || !form.password || !form.firstName || !form.lastName)
      return setFormError("Tous les champs obligatoires doivent être remplis");
    if (form.password.length < 6)
      return setFormError("Le mot de passe doit avoir au moins 6 caractères");
    createUser.mutate(form);
  };

  const card = (extra?: any) => ({
    background: "white", borderRadius: 16, border: "1px solid #e5e7eb",
    padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", ...extra,
  });

  // Rôles disponibles selon le rôle de l'admin connecté
  const availableRoles = user?.role === "SUPER_ADMIN"
    ? [
        { value: "DELEGATE",    label: "Délégué Médical" },
        { value: "ADMIN",       label: "Administrateur" },
        { value: "SUPER_ADMIN", label: "Super Administrateur" },
      ]
    : [
        { value: "DELEGATE", label: "Délégué Médical" },
        { value: "ADMIN",    label: "Administrateur" },
      ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* En-tête */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
        borderRadius: 16, padding: 24, color: "white",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "Georgia, serif" }}>
            Gestion des Accès
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.75 }}>
            {(users as any[]).length} utilisateur(s) enregistré(s)
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { if (confirm("Déconnecter TOUS les utilisateurs ?")) disconnectAll.mutate(); }}
            style={{
              background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: 10, padding: "9px 16px", color: "white", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
            }}>
            <LogOut size={14} /> Tout déconnecter
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 10, padding: "9px 16px", color: "white", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
            }}>
            <UserPlus size={14} /> Créer un accès
          </button>
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e3a5f" }}>Nouvel utilisateur</h3>
            <button onClick={() => { setShowForm(false); setFormError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
              <X size={18} />
            </button>
          </div>

          {formError && (
            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
              ❌ {formError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={s.label}>Prénom *</label>
                <input style={s.input} placeholder="Prénom"
                  value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Nom *</label>
                <input style={s.input} placeholder="Nom"
                  value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Email *</label>
                <input type="email" style={s.input} placeholder="email@exemple.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Mot de passe *</label>
                <input type="password" style={s.input} placeholder="Min. 6 caractères"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Rôle *</label>
                <select style={s.input} value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {availableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {form.role !== "SUPER_ADMIN" && (
                <div>
                  <label style={s.label}>Laboratoire *</label>
                  <select style={s.input} value={form.labs[0]}
                    onChange={e => setForm(f => ({ ...f, labs: [e.target.value] }))}>
                    {LABS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
              {form.role === "DELEGATE" && (
                <>
                  <div>
                    <label style={s.label}>Zone</label>
                    <input style={s.input} placeholder="Ex: YOPOUGON"
                      value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} />
                  </div>
                  <div>
                    <label style={s.label}>Téléphone</label>
                    <input style={s.input} placeholder="+225 07 00 00 00"
                      value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="submit" disabled={createUser.isPending} style={{
                background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
                border: "none", borderRadius: 10, padding: "10px 24px",
                color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer",
                opacity: createUser.isPending ? 0.7 : 1,
              }}>
                {createUser.isPending ? "Création..." : "Créer l'accès"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFormError(""); }} style={{
                background: "#f3f4f6", border: "none", borderRadius: 10, padding: "10px 20px",
                color: "#6b7280", fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      <div style={card({ padding: 0, overflow: "hidden" })}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>Chargement...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#1e3a5f", color: "white" }}>
                  {["Utilisateur", "Email", "Rôle", "Labo / Zone", "Connecté", "Actif", "Actions"]
                    .map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 12 }}>
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {(users as any[]).map((u, i) => {
                  const roleColor = ROLE_COLORS[u.role] || { bg: "#f3f4f6", text: "#6b7280" };
                  const isOnline = u.activeSessions?.length > 0;
                  return (
                    <tr key={u.id} style={{
                      borderTop: "1px solid #f3f4f6",
                      background: i % 2 === 1 ? "#fafafa" : "white",
                    }}>
                      {/* Avatar + Nom */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                            background: u.avatar ? "transparent" : "linear-gradient(135deg, #1e3a5f, #2563eb)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "white", fontSize: 13, fontWeight: 700, overflow: "hidden",
                          }}>
                            {u.avatar
                              ? <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : `${u.firstName?.[0]}${u.lastName?.[0]}`
                            }
                          </div>
                          <span style={{ fontWeight: 600, color: "#1f2937" }}>
                            {u.firstName} {u.lastName}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 12 }}>{u.email}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          background: roleColor.bg, color: roleColor.text,
                          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                        }}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 12 }}>
                        {u.adminLabs?.map((al: any) => al.laboratory.name).join(", ") ||
                         (u.delegate ? `${u.delegate.zone} — ${u.delegate?.laboratory?.name || ""}` : "—")}
                      </td>
                      {/* Statut en ligne */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                          background: isOnline ? "#22c55e" : "#d1d5db",
                          boxShadow: isOnline ? "0 0 0 3px rgba(34,197,94,0.2)" : "none",
                        }} title={isOnline ? "En ligne" : "Hors ligne"} />
                      </td>
                      {/* Toggle actif */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <button onClick={() => toggleUser.mutate(u.id)}
                          style={{ background: "none", border: "none", cursor: "pointer" }}>
                          {u.isActive
                            ? <ToggleRight size={26} color="#22c55e" />
                            : <ToggleLeft  size={26} color="#d1d5db" />
                          }
                        </button>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          {isOnline && u.id !== user?.id && (
                            <button
                              onClick={() => { if (confirm(`Déconnecter ${u.firstName} ${u.lastName} ?`)) disconnectUser.mutate(u.id); }}
                              title="Forcer la déconnexion"
                              style={{
                                background: "#fff7ed", border: "1px solid #fed7aa",
                                borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 4,
                                color: "#ea580c", fontSize: 11, fontWeight: 600,
                              }}>
                              <LogOut size={12} /> Déconnecter
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(users as any[]).length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>
                      Aucun utilisateur
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}