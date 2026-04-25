import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, AlertTriangle, Clock, UserX, CheckCircle, Settings, X, Zap, Activity } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useLab }  from "../../../contexts/LabContext";

const STATUS_LABELS: Record<string, string> = {
  EN_VISITE: "En visite", EN_DEPLACEMENT: "En déplacement",
  EN_PAUSE: "En pause", INACTIF: "Inactif",
};
const STATUS_COLORS: Record<string, string> = {
  EN_VISITE: "#16a34a", EN_DEPLACEMENT: "#2563eb",
  EN_PAUSE: "#d97706", INACTIF: "#9ca3af",
};

function minutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}
function formatDuration(mins: number): string {
  if (mins < 60)  return `${mins}min`;
  if (mins < 1440) return `${Math.floor(mins/60)}h${mins%60 > 0 ? String(mins%60).padStart(2,"0") : ""}`;
  return `${Math.floor(mins/1440)}j`;
}

interface Alert {
  id:        string;
  type:      "inactive" | "no_visit" | "offline_long";
  delegate:  { id: string; name: string; zone: string; status: string; lastSeen: string | null };
  message:   string;
  severity:  "high" | "medium";
  since:     string;
}

export default function AlertesTab() {
  const { selectedLab }  = useLab();
  const qc               = useQueryClient();

  const [thresholdInactive, setThresholdInactive] = useState(120);   // minutes
  const [thresholdNoVisit,  setThresholdNoVisit]  = useState(3);     // jours
  const [dismissed,         setDismissed]         = useState<Set<string>>(new Set());
  const [showSettings,      setShowSettings]      = useState(false);

  const { data: delegates = [], isLoading } = useQuery({
    queryKey:        ["delegates-alerts", selectedLab],
    queryFn:         () => api.get("/delegates", { headers: { "X-Lab": selectedLab || "all" } }).then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: reportsData } = useQuery({
    queryKey: ["reports-alerts", selectedLab],
    queryFn:  () => api.get("/reports", {
      params:  { limit: 500, from: new Date(Date.now() - thresholdNoVisit * 86400000).toISOString().split("T")[0] },
      headers: { "X-Lab": selectedLab || "all" },
    }).then(r => r.data),
    refetchInterval: 5 * 60000,
  });

  // ── Calculer les alertes ─────────────────────────────────
  const alerts: Alert[] = [];
  const delegateList = delegates as any[];
  const reportsList  = (reportsData?.reports || []) as any[];

  delegateList.forEach((d: any) => {
    const name    = `${d.user.firstName} ${d.user.lastName}`;
    const lastSeen = d.lastSeen;

    // Alerte inactivité GPS
    if (lastSeen && (d.status === "EN_VISITE" || d.status === "EN_DEPLACEMENT")) {
      const mins = minutesAgo(lastSeen);
      if (mins >= thresholdInactive) {
        alerts.push({
          id:       `inactive_${d.id}`,
          type:     "inactive",
          delegate: { id: d.id, name, zone: d.zone, status: d.status, lastSeen },
          message:  `Aucun mouvement depuis ${formatDuration(mins)}`,
          severity: mins >= thresholdInactive * 2 ? "high" : "medium",
          since:    lastSeen,
        });
      }
    }

    // Alerte aucune visite depuis N jours
    const lastReport = reportsList.filter((r: any) => r.delegateId === d.id).sort((a: any, b: any) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())[0];
    const cutoff     = new Date(Date.now() - thresholdNoVisit * 86400000);

    if (!lastReport || new Date(lastReport.visitDate) < cutoff) {
      const lastStr = lastReport ? lastReport.visitDate : null;
      const days    = lastStr ? Math.floor(minutesAgo(lastStr) / 1440) : null;
      alerts.push({
        id:       `no_visit_${d.id}`,
        type:     "no_visit",
        delegate: { id: d.id, name, zone: d.zone, status: d.status, lastSeen },
        message:  days ? `Aucun rapport depuis ${days} jour(s)` : "Aucun rapport enregistré sur la période",
        severity: (days ?? 999) >= thresholdNoVisit * 2 ? "high" : "medium",
        since:    lastStr || "",
      });
    }
  });

  const activeAlerts = alerts.filter(a => !dismissed.has(a.id));
  const highCount    = activeAlerts.filter(a => a.severity === "high").length;

  const ALERT_ICONS: Record<string, React.ReactNode> = {
    inactive: <Clock size={16} />,
    no_visit: <UserX size={16} />,
  };
  const ALERT_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    high:   { bg: "#fef2f2", border: "#fecaca", text: "#dc2626", icon: "#ef4444" },
    medium: { bg: "#fffbeb", border: "#fde68a", text: "#d97706", icon: "#f59e0b" },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: 14, background: highCount > 0 ? "#fef2f2" : "#f0fdf4", border: `2px solid ${highCount > 0 ? "#fecaca" : "#d1fae5"}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <Bell size={20} color={highCount > 0 ? "#dc2626" : "#059669"} />
            {highCount > 0 && (
              <span style={{ position: "absolute", top: -6, right: -6, background: "#dc2626", color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>
                {highCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Alertes d'inactivité</h2>
            <p className="text-xs text-gray-400">{activeAlerts.length} alerte(s) active(s)</p>
          </div>
        </div>
        <button onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600">
          <Settings size={14} /> Seuils
        </button>
      </div>

      {/* Paramètres */}
      {showSettings && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-sm font-bold text-gray-700 flex items-center gap-2"><Settings size={14} /> Configuration des seuils</p>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">
              Inactivité GPS : {formatDuration(thresholdInactive)} sans mouvement
            </label>
            <input type="range" min={30} max={480} step={30} value={thresholdInactive}
              onChange={e => setThresholdInactive(+e.target.value)}
              className="w-full accent-emerald-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>30min</span><span>4h</span><span>8h</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">
              Aucun rapport depuis : {thresholdNoVisit} jour(s)
            </label>
            <input type="range" min={1} max={14} step={1} value={thresholdNoVisit}
              onChange={e => setThresholdNoVisit(+e.target.value)}
              className="w-full accent-emerald-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1j</span><span>7j</span><span>14j</span>
            </div>
          </div>
        </div>
      )}

      {/* Résumé statuts */}
      {!isLoading && (
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(STATUS_LABELS).map(([s, label]) => {
            const count = delegateList.filter((d: any) => d.status === s).length;
            return (
              <div key={s} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
                <div className="text-2xl font-bold" style={{ color: STATUS_COLORS[s] }}>{count}</div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Liste alertes */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Analyse en cours...</div>
      ) : activeAlerts.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
          <p className="font-bold text-emerald-700">Tout va bien !</p>
          <p className="text-sm text-emerald-600 mt-1">Aucune alerte d'inactivité détectée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Alertes hautes d'abord */}
          {["high", "medium"].map(sev => {
            const group = activeAlerts.filter(a => a.severity === sev);
            if (group.length === 0) return null;
            return (
              <div key={sev}>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: ALERT_COLORS[sev].text }}>
                  {sev === "high" ? "🔴 Critique" : "🟡 Attention"} — {group.length} alerte(s)
                </p>
                {group.map(alert => {
                  const c = ALERT_COLORS[alert.severity];
                  return (
                    <div key={alert.id}
                      style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 16, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: c.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: c.icon }}>
                        {ALERT_ICONS[alert.type]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: "#111827", margin: 0 }}>{alert.delegate.name}</p>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: STATUS_COLORS[alert.delegate.status] + "22", color: STATUS_COLORS[alert.delegate.status], fontWeight: 600 }}>
                            {STATUS_LABELS[alert.delegate.status]}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: c.text, margin: "3px 0 2px", fontWeight: 600 }}>{alert.message}</p>
                        <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Zone : {alert.delegate.zone}</p>
                      </div>
                      <button onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", flexShrink: 0, padding: 4 }}>
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {dismissed.size > 0 && (
        <button onClick={() => setDismissed(new Set())}
          className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
          Restaurer {dismissed.size} alerte(s) ignorée(s)
        </button>
      )}
    </div>
  );
}