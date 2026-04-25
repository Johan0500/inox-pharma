import { useQuery }   from "@tanstack/react-query";
import { Target, TrendingUp, TrendingDown, Zap, Clock, RefreshCw } from "lucide-react";
import api             from "../../../services/api";
import { useLab }      from "../../../contexts/LabContext";

function formatFCFA(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M F";
  if (n >= 1_000)     return (n / 1_000).toFixed(0)     + "k F";
  return n.toLocaleString("fr-FR") + " F";
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const capped = Math.min(Math.max(pct, 0), 100);
  return (
    <div style={{ width: "100%", background: "#f3f4f6", borderRadius: 99, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${capped}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.8s ease" }} />
    </div>
  );
}

function pctColor(pct: number): string {
  if (pct >= 100) return "#10b981";
  if (pct >= 70)  return "#3b82f6";
  if (pct >= 40)  return "#f59e0b";
  return "#ef4444";
}

function StatusBadge({ pct }: { pct: number }) {
  const color = pct >= 100 ? { bg:"#d1fae5",text:"#065f46",label:"✅ Objectif atteint" }
              : pct >= 70  ? { bg:"#dbeafe",text:"#1d4ed8",label:"📈 En bonne voie" }
              : pct >= 40  ? { bg:"#fef3c7",text:"#92400e",label:"⚠️ En retard" }
              :              { bg:"#fee2e2",text:"#991b1b",label:"🔴 Critique" };
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: color.bg, color: color.text }}>
      {color.label}
    </span>
  );
}

export default function SuiviObjectifsTab() {
  const { selectedLab } = useLab();
  const now = new Date();
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const dayOfMonth   = now.getDate();
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);

  const { data: dash, isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey:        ["suivi-objectifs-global", selectedLab],
    queryFn:         () => api.get("/sales-reports/ca-dashboard", {
      params: selectedLab !== "all" ? { laboratoryId: selectedLab } : {},
    }).then(r => r.data),
    refetchInterval: 60_000,
    staleTime:       30_000,
  });

  const { data: delegates = [] } = useQuery({
    queryKey: ["delegates-suivi", selectedLab],
    queryFn:  () => api.get("/delegates", { headers: { "X-Lab": selectedLab || "all" } }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: reportsData } = useQuery({
    queryKey: ["reports-suivi", selectedLab],
    queryFn:  () => api.get("/reports", {
      params:  { limit: 1000, from: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01` },
      headers: { "X-Lab": selectedLab || "all" },
    }).then(r => r.data),
    refetchInterval: 30000,
  });

  const delegateList = delegates as any[];
  const reportsList  = (reportsData?.reports || []) as any[];

  // Visites par délégué ce mois
  const visitsByDelegate: Record<string, number> = {};
  reportsList.forEach((r: any) => {
    visitsByDelegate[r.delegateId] = (visitsByDelegate[r.delegateId] || 0) + 1;
  });

  // Projection fin de mois
  const projectedVisits = (count: number): number =>
    daysInMonth > 0 ? Math.round((count / dayOfMonth) * daysInMonth) : count;

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" }) : "—";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Target size={22} color="white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Suivi objectifs en temps réel</h2>
            <p className="text-xs text-gray-400">Mis à jour à {lastUpdate} · Jour {dayOfMonth}/{daysInMonth} du mois</p>
          </div>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
          <RefreshCw size={12} /> Actualiser
        </button>
      </div>

      {/* Avancement du mois */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Clock size={14} /> Avancement du mois</p>
          <span className="text-sm font-bold text-gray-800">{monthProgress}%</span>
        </div>
        <ProgressBar pct={monthProgress} color="#6366f1" />
        <p className="text-xs text-gray-400 mt-2">Il reste {daysInMonth - dayOfMonth} jour(s) pour atteindre les objectifs</p>
      </div>

      {/* CA Global */}
      {dash && (
        <div style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)", borderRadius: 20, padding: "20px 24px", color: "white" }}>
          <p style={{ opacity: 0.7, fontSize: 12, marginBottom: 4 }}>CA Global du mois</p>
          <p style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>{formatFCFA(dash.currentCA || 0)}</p>
          <p style={{ opacity: 0.7, fontSize: 13, marginTop: 2 }}>Objectif : {formatFCFA(dash.targetCA || 0)}</p>
          <div style={{ marginTop: 14, marginBottom: 8 }}>
            <ProgressBar pct={dash.pct || 0} color="rgba(255,255,255,0.9)" />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.75 }}>
            <span>{dash.pct || 0}% atteint</span>
            <span>Reste : {formatFCFA(Math.max(0, (dash.targetCA||0) - (dash.currentCA||0)))}</span>
          </div>
        </div>
      )}

      {/* Objectifs par délégué */}
      <div className="space-y-3">
        <p className="text-sm font-bold text-gray-700">Performances par délégué</p>
        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Chargement...</div>
        ) : delegateList.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Aucun délégué trouvé</div>
        ) : (
          delegateList.map((d: any) => {
            const visits     = visitsByDelegate[d.id] || 0;
            const projected  = projectedVisits(visits);
            const target     = 20; // cible par défaut (à paramétrer)
            const pct        = target > 0 ? Math.round((visits / target) * 100) : 0;
            const color      = pctColor(pct);
            const statusColor: Record<string,string> = {
              EN_VISITE: "#16a34a", EN_DEPLACEMENT: "#2563eb", EN_PAUSE: "#d97706", INACTIF: "#9ca3af"
            };
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: d.user.avatar ? "transparent" : "linear-gradient(135deg,#059669,#065f46)", overflow: "hidden", flexShrink: 0 }}>
                    {d.user.avatar
                      ? <img src={d.user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 700 }}>
                          {d.user.firstName?.[0]}{d.user.lastName?.[0]}
                        </div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "#111827" }}>{d.user.firstName} {d.user.lastName}</p>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor[d.status] || "#9ca3af", flexShrink: 0 }} />
                    </div>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{d.zone} · {d.laboratory?.name}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0 }}>{visits}</p>
                    <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>visites</p>
                  </div>
                </div>

                <ProgressBar pct={pct} color={color} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <StatusBadge pct={pct} />
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      Projection fin de mois : <strong style={{ color }}>{projected} visites</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}