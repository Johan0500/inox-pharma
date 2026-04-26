import { useState }    from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, Eye, X, MessageSquare, Filter } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useLab }  from "../../../contexts/LabContext";

type VS = "PENDING" | "APPROVED" | "REJECTED";

const STATUS_CFG: Record<VS, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:  { label: "En attente", color: "#d97706", bg: "#fef3c7", icon: <Clock size={14} /> },
  APPROVED: { label: "Approuvé",   color: "#059669", bg: "#d1fae5", icon: <CheckCircle size={14} /> },
  REJECTED: { label: "Rejeté",     color: "#dc2626", bg: "#fee2e2", icon: <XCircle size={14} /> },
};

export default function ValidationRapportsTab() {
  const { user }        = useAuth();
  const { selectedLab } = useLab();
  const qc              = useQueryClient();

  const [filterStatus,   setFilterStatus]   = useState<"ALL" | VS>("PENDING");
  const [filterDelegate, setFilterDelegate] = useState("");
  const [selected,       setSelected]       = useState<any | null>(null);
  const [comment,        setComment]        = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["reports-validation", selectedLab, filterDelegate, filterStatus],
    queryFn:  () => api.get("/reports", {
      params:  {
        limit:            200,
        delegateId:       filterDelegate || undefined,
        validationStatus: filterStatus === "ALL" ? undefined : filterStatus,
      },
      headers: { "X-Lab": selectedLab || "all" },
    }).then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: delegates = [] } = useQuery({
    queryKey: ["delegates-validation", selectedLab],
    queryFn:  () => api.get("/delegates", { headers: { "X-Lab": selectedLab || "all" } }).then(r => r.data),
    staleTime: 60000,
  });

  // ── Mutation validation ──────────────────────────────────
  const validateMut = useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: VS; comment: string }) =>
      api.patch(`/reports/${id}/validate`, { status, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports-validation"] });
      setSelected(null);
      setComment("");
    },
  });

  const reports = (data?.reports || []) as any[];
  const counts = {
    PENDING:  reports.filter((r:any) => r.validationStatus === "PENDING").length,
    APPROVED: reports.filter((r:any) => r.validationStatus === "APPROVED").length,
    REJECTED: reports.filter((r:any) => r.validationStatus === "REJECTED").length,
  };

  const pendingTotal = (data?.total || 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#7c3aed,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <CheckCircle size={22} color="white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Validation des rapports</h2>
          <p className="text-xs text-gray-400">{counts.PENDING} en attente · {counts.APPROVED} approuvés · {counts.REJECTED} rejetés</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(["PENDING","APPROVED","REJECTED"] as VS[]).map(s => {
          const cfg = STATUS_CFG[s];
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ background: filterStatus===s ? cfg.bg : "white", border:`1.5px solid ${filterStatus===s ? cfg.color : "#e5e7eb"}`, borderRadius:16, padding:"12px 8px", cursor:"pointer" }}>
              <p style={{ fontSize:24, fontWeight:800, color:cfg.color, margin:0 }}>{counts[s]}</p>
              <p style={{ fontSize:11, color:"#6b7280", margin:0 }}>{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filtres */}
      <div className="flex gap-3">
        <select value={filterDelegate} onChange={e => setFilterDelegate(e.target.value)}
          className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 bg-white">
          <option value="">Tous les délégués</option>
          {(delegates as any[]).map((d:any) => (
            <option key={d.id} value={d.id}>{d.user.firstName} {d.user.lastName}</option>
          ))}
        </select>
        <button onClick={() => setFilterStatus("ALL")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${filterStatus==="ALL" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
          Tous
        </button>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Chargement…</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-gray-300">
          <CheckCircle size={40} className="mx-auto mb-3" />
          <p className="text-gray-400">Aucun rapport dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report:any) => {
            const status = (report.validationStatus as VS) || "PENDING";
            const cfg    = STATUS_CFG[status];
            return (
              <div key={report.id} style={{ background:"white", border:`1.5px solid ${status!=="PENDING" ? cfg.color+"44" : "#e5e7eb"}`, borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:3 }}>
                    <p style={{ fontWeight:700, fontSize:14, margin:0, color:"#111827" }}>{report.doctorName}</p>
                    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:cfg.bg, color:cfg.color, fontWeight:600, display:"flex", alignItems:"center", gap:3 }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    {report.photos?.length > 0 && (
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"#e0f2fe", color:"#0369a1", fontWeight:600 }}>
                        📸 {report.photos.length} photo(s)
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize:12, color:"#9ca3af", margin:0 }}>
                    {report.delegate?.user?.firstName} {report.delegate?.user?.lastName} · {new Date(report.visitDate).toLocaleDateString("fr-FR")}
                  </p>
                  {report.validationComment && (
                    <p style={{ fontSize:11, color:"#9ca3af", margin:"3px 0 0", fontStyle:"italic" }}>"{report.validationComment}"</p>
                  )}
                </div>
                <button onClick={() => { setSelected(report); setComment(""); }}
                  style={{ background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:10, padding:"6px 12px", cursor:"pointer", fontSize:12, color:"#374151", fontWeight:600, display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                  <Eye size={12} /> Voir
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal détail + action */}
      {selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
          onClick={() => setSelected(null)}>
          <div style={{ background:"white", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:600, maxHeight:"85vh", overflowY:"auto", padding:"24px 20px 32px" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <h3 style={{ fontWeight:700, fontSize:16, margin:0 }}>{selected.doctorName}</h3>
              <button onClick={() => setSelected(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af" }}><X size={20} /></button>
            </div>

            <p style={{ fontSize:12, color:"#9ca3af", marginBottom:12 }}>
              {selected.delegate?.user?.firstName} {selected.delegate?.user?.lastName} · {new Date(selected.visitDate).toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })}
            </p>

            {/* Photos */}
            {selected.photos?.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <p style={{ fontSize:11, fontWeight:700, color:"#6b7280", marginBottom:6 }}>📸 PHOTOS ({selected.photos.length})</p>
                <div style={{ display:"flex", gap:8, overflowX:"auto" }}>
                  {selected.photos.map((url: string, i: number) => (
                    <img key={i} src={url} alt={`Photo ${i+1}`}
                      style={{ width:110, height:80, objectFit:"cover", borderRadius:10, flexShrink:0, border:"1px solid #e5e7eb" }} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ background:"#f9fafb", borderRadius:12, padding:"12px 14px", marginBottom:14, maxHeight:180, overflowY:"auto" }}>
              <pre style={{ whiteSpace:"pre-wrap", fontSize:12, color:"#374151", margin:0, fontFamily:"inherit", lineHeight:1.6 }}>
                {selected.notes}
              </pre>
            </div>

            {(selected.validationStatus as VS) === "PENDING" ? (
              <>
                <div style={{ marginBottom:12 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:6 }}>
                    Commentaire (optionnel — visible par le délégué)
                  </label>
                  <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                    placeholder="Ex: Manque le nom du médecin prescripteur…"
                    style={{ width:"100%", border:"1.5px solid #e5e7eb", borderRadius:12, padding:"10px 12px", fontSize:13, outline:"none", resize:"none", boxSizing:"border-box" }} />
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button
                    onClick={() => validateMut.mutate({ id: selected.id, status:"REJECTED", comment })}
                    disabled={validateMut.isPending}
                    style={{ flex:1, padding:"12px 0", borderRadius:14, background:"#fee2e2", border:"none", color:"#dc2626", fontWeight:700, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <XCircle size={16} /> Rejeter
                  </button>
                  <button
                    onClick={() => validateMut.mutate({ id: selected.id, status:"APPROVED", comment })}
                    disabled={validateMut.isPending}
                    style={{ flex:2, padding:"12px 0", borderRadius:14, background:"linear-gradient(135deg,#065f46,#059669)", border:"none", color:"white", fontWeight:700, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <CheckCircle size={16} /> {validateMut.isPending ? "En cours…" : "Approuver"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ background:STATUS_CFG[selected.validationStatus as VS]?.bg || "#f9fafb", border:`1px solid ${STATUS_CFG[selected.validationStatus as VS]?.color || "#e5e7eb"}44`, borderRadius:12, padding:"10px 14px" }}>
                <p style={{ fontSize:13, color:STATUS_CFG[selected.validationStatus as VS]?.color, fontWeight:600, margin:0 }}>
                  {STATUS_CFG[selected.validationStatus as VS]?.label} par {selected.validatedBy}
                </p>
                {selected.validationComment && <p style={{ fontSize:12, color:"#9ca3af", margin:"4px 0 0" }}>"{selected.validationComment}"</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}