import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Check, Loader, WifiOff } from "lucide-react";
import api         from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { isOnline, saveReportOffline } from "../../services/offlineSync";
import { Template } from "./RapportsView";

interface Props {
  template: Template;
  onBack:   () => void;
}

export default function TemplateReport({ template, onBack }: Props) {
  const { user }  = useAuth();
  const qc        = useQueryClient();

  const [fields,     setFields]     = useState<Record<string, string>>({});
  const [visitDate,  setVisitDate]  = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [offline,    setOffline]    = useState(false);
  const [error,      setError]      = useState("");

  const updateField = (id: string, val: string) => {
    setFields(prev => ({ ...prev, [id]: val }));
    setError("");
  };

  // Vérifier les champs requis
  const missingRequired = template.fields
    .filter(f => f.required && !fields[f.id]?.trim())
    .map(f => f.label);

  const handleSubmit = async () => {
    if (missingRequired.length > 0) {
      setError(`Champs requis manquants : ${missingRequired.join(", ")}`);
      return;
    }

    setSubmitting(true);
    setError("");

    // Construire les notes à partir des champs remplis
    const notesLines = [
      `=== ${template.name.toUpperCase()} ===`,
      `Date : ${new Date(visitDate).toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })}`,
      `Catégorie : ${template.category}`,
      "",
      ...template.fields
        .filter(f => fields[f.id])
        .map(f => {
          const val = fields[f.id];
          return `${f.label} : ${f.type === "checkbox" ? (val === "oui" ? "Oui ✓" : "Non ✗") : val}`;
        }),
    ];

    const body = {
      doctorName:    `${template.name} — ${new Date(visitDate).toLocaleDateString("fr-FR")}`,
      specialty:     template.category,
      notes:         notesLines.join("\n"),
      productsShown: "",
      photos:        [],
      visitDate:     new Date(visitDate).toISOString(),
    };

    try {
      if (!isOnline()) {
        saveReportOffline({ ...body });
        setOffline(true);
        setSuccess(true);
        setSubmitting(false);
        return;
      }
      await api.post("/reports", body);
      qc.invalidateQueries({ queryKey: ["my-reports-dashboard"] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFields({});
        setOffline(false);
        onBack();
      }, 2000);
    } catch {
      setError("Erreur lors de l'envoi. Vérifiez votre connexion.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px", background:"linear-gradient(135deg,#9d174d,#be185d)", borderRadius:18 }}>
        <span style={{ fontSize:36 }}>{template.emoji}</span>
        <div>
          <p style={{ fontWeight:800, fontSize:17, color:"white", margin:0 }}>{template.name}</p>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.7)", margin:"3px 0 0" }}>{template.description || template.category}</p>
        </div>
      </div>

      {/* Date */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <label className="text-xs font-semibold text-gray-500 mb-2 block">📅 Date de la visite</label>
        <input
          type="date"
          value={visitDate}
          onChange={e => setVisitDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          style={{ width:"100%", border:"1.5px solid #e5e7eb", borderRadius:12, padding:"10px 14px", fontSize:14, outline:"none", boxSizing:"border-box" }}
        />
      </div>

      {/* Champs du template */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        {template.fields.map(field => (
          <div key={field.id}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>
              {field.label}
              {field.required && <span style={{ color:"#dc2626", marginLeft:4 }}>*</span>}
            </label>

            {field.type === "textarea" ? (
              <textarea
                value={fields[field.id] || ""}
                onChange={e => updateField(field.id, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                style={{ width:"100%", border:"1.5px solid #e5e7eb", borderRadius:12, padding:"10px 14px", fontSize:14, outline:"none", resize:"none", boxSizing:"border-box", transition:"border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = "#be185d"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            ) : field.type === "select" ? (
              <select
                value={fields[field.id] || ""}
                onChange={e => updateField(field.id, e.target.value)}
                style={{ width:"100%", border:"1.5px solid #e5e7eb", borderRadius:12, padding:"10px 14px", fontSize:14, outline:"none", background:"white", boxSizing:"border-box" }}
              >
                <option value="">-- Sélectionner --</option>
                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : field.type === "checkbox" ? (
              <div style={{ display:"flex", gap:12 }}>
                {["oui", "non"].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => updateField(field.id, val)}
                    style={{
                      flex:1, padding:"10px", borderRadius:12, border:`1.5px solid ${fields[field.id]===val ? "#be185d" : "#e5e7eb"}`,
                      background: fields[field.id]===val ? "#fce7f3" : "white",
                      color: fields[field.id]===val ? "#be185d" : "#6b7280",
                      fontWeight: fields[field.id]===val ? 700 : 400,
                      cursor:"pointer", fontSize:14, transition:"all 0.15s",
                    }}
                  >
                    {val === "oui" ? "✓ Oui" : "✗ Non"}
                  </button>
                ))}
              </div>
            ) : field.type === "number" ? (
              <input
                type="number"
                value={fields[field.id] || ""}
                onChange={e => updateField(field.id, e.target.value)}
                placeholder={field.placeholder}
                style={{ width:"100%", border:"1.5px solid #e5e7eb", borderRadius:12, padding:"10px 14px", fontSize:14, outline:"none", boxSizing:"border-box" }}
                onFocus={e => e.target.style.borderColor = "#be185d"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            ) : (
              <input
                type="text"
                value={fields[field.id] || ""}
                onChange={e => updateField(field.id, e.target.value)}
                placeholder={field.placeholder}
                style={{ width:"100%", border:"1.5px solid #e5e7eb", borderRadius:12, padding:"10px 14px", fontSize:14, outline:"none", boxSizing:"border-box", transition:"border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = "#be185d"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            )}
          </div>
        ))}

        {template.fields.length === 0 && (
          <p style={{ fontSize:13, color:"#9ca3af", textAlign:"center", padding:"16px 0" }}>
            Ce template n'a pas encore de champs configurés.
          </p>
        )}
      </div>

      {/* Indicateur hors ligne */}
      {!navigator.onLine && (
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:"10px 14px" }}>
          <WifiOff size={14} color="#d97706" />
          <p style={{ margin:0, fontSize:12, color:"#92400e" }}>
            Hors ligne — le rapport sera envoyé à la reconnexion
          </p>
        </div>
      )}

      {error && (
        <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:12, padding:"10px 14px", color:"#dc2626", fontSize:13 }}>
          ❌ {error}
        </div>
      )}

      {/* Champs requis manquants */}
      {missingRequired.length > 0 && !error && (
        <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:"10px 14px" }}>
          <p style={{ fontSize:12, color:"#92400e", margin:0 }}>
            ⚠️ Champs requis : {missingRequired.join(", ")}
          </p>
        </div>
      )}

      {/* Bouton soumettre */}
      {success ? (
        <div style={{ background: offline ? "#fffbeb" : "#f0fdf4", border:`1px solid ${offline ? "#fde68a" : "#bbf7d0"}`, borderRadius:16, padding:"16px", display:"flex", alignItems:"center", justifyContent:"center", gap:8, color: offline ? "#92400e" : "#065f46", fontWeight:700, fontSize:15 }}>
          {offline ? <><WifiOff size={18} /> Sauvegardé — envoi automatique à la reconnexion</> : <><Check size={20} /> Rapport envoyé avec succès !</>}
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width:"100%", padding:"15px", borderRadius:16,
            background: submitting ? "#f3f4f6" : "linear-gradient(135deg,#9d174d,#be185d)",
            border:"none", color: submitting ? "#9ca3af" : "white",
            fontWeight:700, fontSize:15, cursor: submitting ? "not-allowed" : "pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            boxShadow: submitting ? "none" : "0 4px 16px rgba(190,24,93,0.3)",
          }}
        >
          {submitting
            ? <><Loader size={16} style={{ animation:"spin 1s linear infinite" }} /> Envoi en cours…</>
            : <><Save size={16} /> Soumettre le rapport</>
          }
        </button>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}