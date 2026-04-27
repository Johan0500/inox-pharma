import { useState }  from "react";
import { useQuery }  from "@tanstack/react-query";
import { ChevronLeft, FileText, ClipboardList, Loader } from "lucide-react";
import api            from "../../services/api";
import VisitReport    from "./VisitReport";
import TemplateReport from "./TemplateReport";

export interface TemplateField {
  id: string; label: string; type: string;
  options?: string[]; required: boolean; placeholder: string;
}
export interface Template {
  id: string; name: string; category: string;
  description: string; fields: TemplateField[];
  isReport: boolean; emoji: string; createdAt: string;
}

type View = "list" | "hebdo" | { templateId: string };

export default function RapportsView() {
  const [view, setView] = useState<View>("list");

  // Charger les templates depuis la DB (route publique pour tous les connectés)
  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey:        ["visit-templates-delegate"],
    queryFn:         () => api.get("/visit-templates/reports").then(r => r.data),
    staleTime:       30_000,
    refetchOnWindowFocus: true,
  });

  // ── Vue liste ─────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Mes rapports</h2>
          <p className="text-xs text-gray-400 mt-0.5">Choisissez le type de rapport à remplir</p>
        </div>

        {/* Rapport hebdomadaire — toujours présent */}
        <button
          onClick={() => setView("hebdo")}
          style={{
            width:"100%", display:"flex", alignItems:"center", gap:16,
            padding:"18px 20px", background:"white",
            border:"1.5px solid #d1fae5", borderRadius:18,
            cursor:"pointer", textAlign:"left",
            boxShadow:"0 2px 12px rgba(6,95,70,0.08)", transition:"all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="#059669"; e.currentTarget.style.boxShadow="0 4px 20px rgba(6,95,70,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="#d1fae5"; e.currentTarget.style.boxShadow="0 2px 12px rgba(6,95,70,0.08)"; }}
        >
          <div style={{ width:52, height:52, borderRadius:16, background:"linear-gradient(135deg,#065f46,#059669)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <FileText size={24} color="white" />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <p style={{ fontWeight:700, fontSize:15, color:"#111827", margin:0 }}>Rapport Hebdomadaire</p>
              <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"#d1fae5", color:"#065f46", fontWeight:700 }}>Obligatoire</span>
            </div>
            <p style={{ fontSize:12, color:"#9ca3af", margin:"3px 0 0" }}>
              Tableau d'activités · Réflexions pharmaceutiques et médicales · Concurrence
            </p>
          </div>
          <span style={{ color:"#d1d5db", fontSize:22, fontWeight:300 }}>›</span>
        </button>

        {/* Templates depuis la DB */}
        {isLoading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"24px", color:"#9ca3af", fontSize:13 }}>
            <Loader size={16} style={{ animation:"spin 1s linear infinite" }} />
            Chargement des rapports…
          </div>
        ) : templates.length > 0 ? (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
              Autres rapports
            </p>
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => setView({ templateId: tpl.id })}
                style={{
                  width:"100%", display:"flex", alignItems:"center", gap:16,
                  padding:"16px 20px", background:"white",
                  border:"1.5px solid #fce7f3", borderRadius:18,
                  cursor:"pointer", textAlign:"left",
                  boxShadow:"0 2px 8px rgba(190,24,93,0.06)", transition:"all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="#be185d"; e.currentTarget.style.boxShadow="0 4px 16px rgba(190,24,93,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="#fce7f3"; e.currentTarget.style.boxShadow="0 2px 8px rgba(190,24,93,0.06)"; }}
              >
                <div style={{ width:52, height:52, borderRadius:16, background:"linear-gradient(135deg,#9d174d,#be185d)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:26 }}>
                  {tpl.emoji || "📋"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <p style={{ fontWeight:700, fontSize:15, color:"#111827", margin:0 }}>{tpl.name}</p>
                    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"#fce7f3", color:"#be185d", fontWeight:600 }}>{tpl.category}</span>
                  </div>
                  {tpl.description && (
                    <p style={{ fontSize:12, color:"#9ca3af", margin:"3px 0 0" }}>{tpl.description}</p>
                  )}
                  <p style={{ fontSize:11, color:"#e5e7eb", margin:"3px 0 0" }}>
                    {Array.isArray(tpl.fields) ? tpl.fields.length : 0} champ(s)
                  </p>
                </div>
                <span style={{ color:"#d1d5db", fontSize:22, fontWeight:300 }}>›</span>
              </button>
            ))}
          </>
        ) : (
          <div style={{ background:"#f9fafb", border:"2px dashed #e5e7eb", borderRadius:16, padding:"20px", textAlign:"center" }}>
            <ClipboardList size={28} color="#d1d5db" style={{ margin:"0 auto 8px" }} />
            <p style={{ fontSize:13, color:"#9ca3af", margin:0 }}>
              Aucun rapport supplémentaire disponible.
            </p>
            <p style={{ fontSize:11, color:"#d1d5db", margin:"4px 0 0" }}>
              L'administrateur peut en créer depuis son tableau de bord.
            </p>
          </div>
        )}

        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Vue rapport hebdomadaire ──────────────────────────────
  if (view === "hebdo") {
    return (
      <div>
        <button
          onClick={() => setView("list")}
          style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"#059669", fontSize:13, fontWeight:600, marginBottom:16, padding:0 }}
        >
          <ChevronLeft size={16} /> Retour aux rapports
        </button>
        <VisitReport onBack={() => setView("list")} />
      </div>
    );
  }

  // ── Vue template personnalisé ─────────────────────────────
  const tpl = templates.find(t => t.id === (view as any).templateId);
  if (!tpl) {
    return (
      <button onClick={() => setView("list")} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"#be185d", fontSize:13, fontWeight:600, padding:0 }}>
        <ChevronLeft size={16} /> Retour aux rapports
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setView("list")}
        style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"#be185d", fontSize:13, fontWeight:600, marginBottom:16, padding:0 }}
      >
        <ChevronLeft size={16} /> Retour aux rapports
      </button>
      <TemplateReport template={tpl} onBack={() => setView("list")} />
    </div>
  );
}