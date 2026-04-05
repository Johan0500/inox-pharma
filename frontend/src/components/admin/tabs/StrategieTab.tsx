import { useState } from "react";
import {
  Target, Plus, Trash2, Pencil, X, Check,
  FlaskConical, MapPin, Package, Calendar,
  Loader2, AlertCircle, CheckCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";

// ── Types ────────────────────────────────────────────────────
interface Strategy {
  id:            string;
  title:         string;
  description:   string | null;
  targetProduct: string | null;
  targetZone:    string | null;
  startDate:     string | null;
  endDate:       string | null;
  laboratoryId:  string;
  laboratory:    { name: string };
  createdBy:     { firstName: string; lastName: string };
  createdAt:     string;
}

interface Lab { id: string; name: string; }

const EMPTY_FORM = {
  title: "", description: "", targetProduct: "",
  targetZone: "", startDate: "", endDate: "", laboratoryId: "",
};

export default function StrategieTab() {
  const { user }  = useAuth();
  const qc        = useQueryClient();
  const [showForm, setShowForm]   = useState(false);
  const [editing,  setEditing]    = useState<Strategy | null>(null);
  const [form,     setForm]       = useState({ ...EMPTY_FORM });
  const [toast,    setToast]      = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Données ────────────────────────────────────────────────
  const { data: strategies = [], isLoading } = useQuery<Strategy[]>({
    queryKey: ["strategies"],
    queryFn:  () => api.get("/strategies").then(r => r.data),
  });

  const { data: labs = [] } = useQuery<Lab[]>({
    queryKey: ["laboratories"],
    queryFn:  () => api.get("/laboratories").then(r => r.data),
  });

  // ── Mutations ──────────────────────────────────────────────
  const mutCreate = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => api.post("/strategies", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategies"] });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      showToast("success", "Stratégie créée");
    },
    onError: () => showToast("error", "Erreur lors de la création"),
  });

  const mutUpdate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/strategies/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategies"] });
      setEditing(null);
      showToast("success", "Stratégie mise à jour");
    },
    onError: () => showToast("error", "Erreur lors de la mise à jour"),
  });

  const mutDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/strategies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategies"] });
      showToast("success", "Stratégie supprimée");
    },
    onError: () => showToast("error", "Erreur lors de la suppression"),
  });

  // ── Helpers ────────────────────────────────────────────────
  const openEdit = (s: Strategy) => {
    setEditing(s);
    setForm({
      title:         s.title         || "",
      description:   s.description   || "",
      targetProduct: s.targetProduct || "",
      targetZone:    s.targetZone    || "",
      startDate:     s.startDate ? s.startDate.slice(0, 10) : "",
      endDate:       s.endDate   ? s.endDate.slice(0, 10)   : "",
      laboratoryId:  s.laboratoryId  || "",
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return showToast("error", "Le titre est requis");
    if (!form.laboratoryId)  return showToast("error", "Le laboratoire est requis");

    if (editing) {
      mutUpdate.mutate({ id: editing.id, data: form });
    } else {
      mutCreate.mutate(form);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM });
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : null;

  const isActive = (s: Strategy) => {
    const now = new Date();
    if (s.startDate && new Date(s.startDate) > now) return false;
    if (s.endDate   && new Date(s.endDate)   < now) return false;
    return true;
  };

  // ── Styles ─────────────────────────────────────────────────
  const input = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: "100%", padding: "10px 14px",
    border: "1px solid #d1fae5", borderRadius: 10,
    fontSize: 13, color: "#374151", outline: "none",
    background: "white", boxSizing: "border-box" as const,
    ...extra,
  });

  const label = (text: string) => (
    <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280",
      display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
      {text}
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: toast.type === "success" ? "#064e3b" : "#dc2626",
          color: "white", borderRadius: 12, padding: "12px 20px",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)", fontSize: 14, fontWeight: 500,
        }}>
          {toast.type === "success" ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div style={{
        background: "linear-gradient(135deg, #064e3b 0%, #059669 100%)",
        borderRadius: 16, padding: 24, color: "white",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 20px rgba(6,78,59,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Target size={26}/>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "Georgia, serif" }}>
              Stratégies
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.75 }}>
              {strategies.length} stratégie(s) configurée(s)
            </p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }}
            style={{
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 12, padding: "10px 20px", color: "white", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600,
            }}>
            <Plus size={16}/> Nouvelle stratégie
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div style={{
          background: "white", borderRadius: 16, border: "1px solid #d1fae5",
          padding: 24, boxShadow: "0 2px 12px rgba(6,78,59,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#064e3b" }}>
              {editing ? "Modifier la stratégie" : "Nouvelle stratégie"}
            </h3>
            <button onClick={handleCancel} style={{
              background: "none", border: "none", cursor: "pointer", color: "#9ca3af",
            }}>
              <X size={18}/>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Titre */}
            <div style={{ gridColumn: "1 / -1" }}>
              {label("Titre *")}
              <input style={input()} placeholder="Ex: Conquête zone nord"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}/>
            </div>

            {/* Laboratoire */}
            <div>
              {label("Laboratoire *")}
              <select style={input()}
                value={form.laboratoryId}
                onChange={e => setForm(f => ({ ...f, laboratoryId: e.target.value }))}>
                <option value="">-- Choisir --</option>
                {labs.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Produit cible */}
            <div>
              {label("Produit cible")}
              <input style={input()} placeholder="Ex: CROCIP-TZ"
                value={form.targetProduct}
                onChange={e => setForm(f => ({ ...f, targetProduct: e.target.value }))}/>
            </div>

            {/* Zone cible */}
            <div>
              {label("Zone cible")}
              <input style={input()} placeholder="Ex: Abidjan Nord"
                value={form.targetZone}
                onChange={e => setForm(f => ({ ...f, targetZone: e.target.value }))}/>
            </div>

            {/* Description */}
            <div style={{ gridColumn: "1 / -1" }}>
              {label("Description")}
              <textarea style={{ ...input(), minHeight: 80, resize: "vertical" as const }}
                placeholder="Détails de la stratégie..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
            </div>

            {/* Dates */}
            <div>
              {label("Date de début")}
              <input type="date" style={input()}
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}/>
            </div>
            <div>
              {label("Date de fin")}
              <input type="date" style={input()}
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}/>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            <button onClick={handleCancel} style={{
              padding: "10px 20px", borderRadius: 10, border: "1px solid #d1fae5",
              background: "white", color: "#6b7280", cursor: "pointer", fontSize: 13,
            }}>
              Annuler
            </button>
            <button onClick={handleSubmit}
              disabled={mutCreate.isPending || mutUpdate.isPending}
              style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #064e3b, #059669)",
                color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8,
                opacity: (mutCreate.isPending || mutUpdate.isPending) ? 0.7 : 1,
              }}>
              {(mutCreate.isPending || mutUpdate.isPending)
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }}/> Enregistrement...</>
                : <><Check size={15}/> {editing ? "Mettre à jour" : "Créer la stratégie"}</>}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
          height: 200, gap: 12, color: "#064e3b" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }}/>
          <span style={{ fontSize: 14 }}>Chargement...</span>
        </div>
      ) : strategies.length === 0 ? (
        <div style={{
          background: "white", borderRadius: 16, border: "1px solid #d1fae5",
          padding: 48, textAlign: "center", color: "#9ca3af",
        }}>
          <Target size={40} style={{ opacity: 0.3, marginBottom: 12 }}/>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#374151" }}>
            Aucune stratégie
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>
            Cliquez sur "Nouvelle stratégie" pour commencer.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {strategies.map(s => (
            <div key={s.id} style={{
              background: "white", borderRadius: 16,
              border: `1px solid ${isActive(s) ? "#d1fae5" : "#e5e7eb"}`,
              padding: 20, boxShadow: "0 2px 8px rgba(6,78,59,0.04)",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                {/* Titre + statut */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#064e3b" }}>
                    {s.title}
                  </h3>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                    background: isActive(s) ? "#d1fae5" : "#f3f4f6",
                    color: isActive(s) ? "#064e3b" : "#9ca3af",
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>
                    {isActive(s) ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Description */}
                {s.description && (
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                    {s.description}
                  </p>
                )}

                {/* Badges infos */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={{
                    display: "flex", alignItems: "center", gap: 4,
                    background: "#f0fdf4", color: "#059669",
                    fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                  }}>
                    <FlaskConical size={11}/> {s.laboratory.name}
                  </span>
                  {s.targetProduct && (
                    <span style={{
                      display: "flex", alignItems: "center", gap: 4,
                      background: "#fef3c7", color: "#d97706",
                      fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                    }}>
                      <Package size={11}/> {s.targetProduct}
                    </span>
                  )}
                  {s.targetZone && (
                    <span style={{
                      display: "flex", alignItems: "center", gap: 4,
                      background: "#eff6ff", color: "#3b82f6",
                      fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                    }}>
                      <MapPin size={11}/> {s.targetZone}
                    </span>
                  )}
                  {(s.startDate || s.endDate) && (
                    <span style={{
                      display: "flex", alignItems: "center", gap: 4,
                      background: "#f5f3ff", color: "#7c3aed",
                      fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                    }}>
                      <Calendar size={11}/>
                      {formatDate(s.startDate)} {s.endDate ? `→ ${formatDate(s.endDate)}` : ""}
                    </span>
                  )}
                </div>

                {/* Créé par */}
                <p style={{ margin: "10px 0 0", fontSize: 11, color: "#9ca3af" }}>
                  Créé par {s.createdBy.firstName} {s.createdBy.lastName} —{" "}
                  {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => openEdit(s)} style={{
                  background: "#f0fdf4", border: "none", borderRadius: 8,
                  width: 34, height: 34, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#059669",
                }} title="Modifier">
                  <Pencil size={15}/>
                </button>
                <button
                  onClick={() => { if (confirm("Supprimer cette stratégie ?")) mutDelete.mutate(s.id); }}
                  style={{
                    background: "#fee2e2", border: "none", borderRadius: 8,
                    width: 34, height: 34, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#dc2626",
                  }} title="Supprimer">
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}