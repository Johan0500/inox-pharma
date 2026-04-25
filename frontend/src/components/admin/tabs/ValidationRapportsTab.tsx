import { useState }    from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, Eye, X, MessageSquare, Filter, ChevronDown } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useLab }  from "../../../contexts/LabContext";

type ValidationStatus = "PENDING" | "APPROVED" | "REJECTED";

const STATUS_CONFIG: Record<ValidationStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:  { label: "En attente", color: "#d97706", bg: "#fef3c7", icon: <Clock size={14} /> },
  APPROVED: { label: "Approuvé",   color: "#059669", bg: "#d1fae5", icon: <CheckCircle size={14} /> },
  REJECTED: { label: "Rejeté",     color: "#dc2626", bg: "#fee2e2", icon: <XCircle size={14} /> },
};

// État local de validation (pas de colonne en DB — on utilise un store côté client + API mock)
// En production, ajouter un champ `validationStatus` et `validationComment` dans VisitReport
const LOCAL_KEY = "report_validations";
function getValidations(): Record<string, { status: ValidationStatus; comment: string; by: string; at: string }> {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}"); } catch { return {}; }
}
function saveValidation(id: string, status: ValidationStatus, comment: string, by: string) {
  const v = getValidations();
  v[id] = { status, comment, by, at: new Date().toISOString() };
  localStorage.setItem(LOCAL_KEY, JSON.stringify(v));
}

export default function ValidationRapportsTab() {
  const { user }        = useAuth();
  const { selectedLab } = useLab();
  const qc              = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<"ALL" | ValidationStatus>("PENDING");
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [comment,       setComment]       = useState("");
  const [validations,   setValidations]   = useState(getValidations());
  const [filterDelegate, setFilterDelegate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["reports-validation", selectedLab, filterDelegate],
    queryFn:  () => api.get("/reports", {
      params:  { limit: 100, delegateId: filterDelegate || undefined },
      headers: { "X-Lab": selectedLab || "all" },
    }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: delegates = [] } = useQuery({
    queryKey: ["delegates-validation", selectedLab],
    queryFn:  () => api.get("/delegates", { headers: { "X-Lab": selectedLab || "all" } }).then(r => r.data),
    staleTime: 60000,
  });

  const reports = ((data?.reports || []) as any[]).filter(r => r.specialty === "RAPPORT HEBDOMADAIRE");

  const getStatus = (id: string): ValidationStatus => validations[id]?.status || "PENDING";

  const handleValidate = (id: string, status: "APPROVED" | "REJECTED") => {
    const adminName = `${user?.firstName} ${user?.lastName}`;
    saveValidation(id, status, comment, adminName);
    setValidations(getValidations());
    setComment("");
    setSelectedReport(null);
  };

  const filtered = reports.filter(r => filterStatus === "ALL" || getStatus(r.id) === filterStatus);

  const counts = {
    PENDING:  reports.filter(r => getStatus(r.id) === "PENDING").length,
    APPROVED: reports.filter(r => getStatus(r.id) === "APPROVED").length,
    REJECTED: reports.filter(r => getStatus(r.id) === "REJECTED").length,
  };

  const parseNotes = (notes: string) => {
    const lines: Record<string, string> = {};
    notes.split("\n").forEach(line => {
      const colonIdx = line.indexOf(":");
      if (colonIdx > -1) {
        const key = line.slice(0, colonIdx).trim().replace(/^===\s*/, "").replace(/\s*===.*$/, "");
        const val = line.slice(colonIdx + 1).trim();
        if (key && val) lines[key] = val;
      }
    });
    return lines;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle size={22} color="white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Validation des rapports</h2>
          <p className="text-xs text-gray-400">{counts.PENDING} rapport(s) en attente de validation</p>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        {(["PENDING","APPROVED","REJECTED"] as ValidationStatus[]).map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ background: filterStatus === s ? cfg.bg : "white", border: `1.5px solid ${filterStatus === s ? cfg.color : "#e5e7eb"}`, borderRadius: 16, padding: "12px 8px", cursor: "pointer", transition: "all 0.15s" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: cfg.color, margin: 0 }}>{counts[s]}</p>
              <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filtre délégué */}
      <div className="flex gap-3">
        <select value={filterDelegate} onChange={e => setFilterDelegate(e.target.value)}
          className="flex-1 border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white">
          <option value="">Tous les délégués</option>
          {(delegates as any[]).map((d: any) => (
            <option key={d.id} value={d.id}>{d.user.firstName} {d.user.lastName}</option>
          ))}
        </select>
        <button onClick={() => setFilterStatus("ALL")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${filterStatus === "ALL" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
          Tous
        </button>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle size={40} className="mx-auto mb-3 text-gray-200" />
          <p>Aucun rapport dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report: any) => {
            const status  = getStatus(report.id);
            const cfg     = STATUS_CONFIG[status];
            const val     = validations[report.id];
            const parsedNotes = parseNotes(report.notes || "");
            return (
              <div key={report.id} style={{ background: "white", border: `1.5px solid ${status !== "PENDING" ? cfg.color + "44" : "#e5e7eb"}`, borderRadius: 16, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "#111827" }}>{report.doctorName}</p>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                      {report.delegate?.user?.firstName} {report.delegate?.user?.lastName} · {new Date(report.visitDate).toLocaleDateString("fr-FR")}
                    </p>
                    {val?.comment && (
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0", fontStyle: "italic" }}>"{val.comment}"</p>
                    )}
                  </div>
                  <button onClick={() => { setSelectedReport(report); setComment(""); }}
                    style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "#374151", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <Eye size={12} /> Voir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal détail + validation */}
      {selectedReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 env(safe-area-inset-bottom)" }}
          onClick={() => setSelectedReport(null)}>
          <div style={{ background: "white", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 600, maxHeight: "85vh", overflowY: "auto", padding: "24px 20px 32px" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{selectedReport.doctorName}</h3>
              <button onClick={() => setSelectedReport(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={20} /></button>
            </div>

            <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>
              {selectedReport.delegate?.user?.firstName} {selectedReport.delegate?.user?.lastName} · {new Date(selectedReport.visitDate).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>

            <div style={{ background: "#f9fafb", borderRadius: 12, padding: "12px 14px", marginBottom: 16, maxHeight: 200, overflowY: "auto" }}>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#374151", margin: 0, fontFamily: "inherit", lineHeight: 1.6 }}>{selectedReport.notes}</pre>
            </div>

            {getStatus(selectedReport.id) === "PENDING" && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    <MessageSquare size={12} style={{ display: "inline", marginRight: 4 }} />
                    Commentaire (optionnel)
                  </label>
                  <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Ajouter un commentaire pour le délégué…"
                    style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => handleValidate(selectedReport.id, "REJECTED")}
                    style={{ flex: 1, padding: "12px 0", borderRadius: 14, background: "#fee2e2", border: "none", color: "#dc2626", fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <XCircle size={16} /> Rejeter
                  </button>
                  <button onClick={() => handleValidate(selectedReport.id, "APPROVED")}
                    style={{ flex: 2, padding: "12px 0", borderRadius: 14, background: "linear-gradient(135deg,#065f46,#059669)", border: "none", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <CheckCircle size={16} /> Approuver
                  </button>
                </div>
              </>
            )}
            {getStatus(selectedReport.id) !== "PENDING" && (
              <div style={{ background: STATUS_CONFIG[getStatus(selectedReport.id)].bg, border: `1px solid ${STATUS_CONFIG[getStatus(selectedReport.id)].color}44`, borderRadius: 12, padding: "10px 14px" }}>
                <p style={{ fontSize: 13, color: STATUS_CONFIG[getStatus(selectedReport.id)].color, fontWeight: 600, margin: 0 }}>
                  {STATUS_CONFIG[getStatus(selectedReport.id)].label} par {validations[selectedReport.id]?.by}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}