import { useQuery }  from "@tanstack/react-query";
import { Users, FileText, Building2, Activity, TrendingUp, CheckCircle, BarChart3 } from "lucide-react";
import api from "../../../services/api";
import { useLab } from "../../../contexts/LabContext";
import { useAuth } from "../../../contexts/AuthContext";

export default function OverviewTab() {
  const { selectedLab, labName, labColor } = useLab();
  const { user } = useAuth();
  const now        = new Date();
  const isSA       = user?.role === "SUPER_ADMIN";
  const isGlobal   = selectedLab === "all";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats", selectedLab],
    queryFn:  () => api.get("/stats", { headers: { "X-Lab": selectedLab } }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: delegates = [] } = useQuery({
    queryKey: ["delegates-overview"],
    queryFn:  () => api.get("/delegates").then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: recentReports = [] } = useQuery({
    queryKey: ["recent-reports", selectedLab],
    queryFn:  () => api.get("/reports", {
      params:  { page: 1, limit: 6 },
      headers: { "X-Lab": selectedLab },
    }).then(r => r.data?.reports || []),
    refetchInterval: 30000,
  });

  const dl = delegates as any[];
  const activeNow = dl.filter(d => d.status === "EN_VISITE" || d.status === "EN_DEPLACEMENT").length;
  const inPause   = dl.filter(d => d.status === "EN_PAUSE").length;
  const inactive  = dl.filter(d => d.status === "INACTIF").length;

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const STATUS_COLORS: Record<string, string> = {
    EN_VISITE: "#16a34a", EN_DEPLACEMENT: "#2563eb",
    EN_PAUSE: "#d97706", INACTIF: "#9ca3af",
  };
  const STATUS_LABELS: Record<string, string> = {
    EN_VISITE: "En visite", EN_DEPLACEMENT: "En déplacement",
    EN_PAUSE: "En pause", INACTIF: "Inactif",
  };

  const kpis = [
    { label: "Délégués",        value: stats?.totalDelegates,  icon: Users,     color: "#2563eb", bg: "#eff6ff", sub: `${activeNow} actifs` },
    { label: "Rapports hebdo",  value: stats?.totalReports,    icon: FileText,  color: "#7c3aed", bg: "#f5f3ff", sub: "au total" },
    { label: "Pharmacies",      value: stats?.totalPharmacies, icon: Building2, color: "#059669", bg: "#f0fdf4", sub: "référencées" },
    { label: "Actifs ce jour",  value: activeNow,              icon: Activity,  color: "#f59e0b", bg: "#fffbeb", sub: `${inPause} en pause` },
  ];

  return (
    <div className="space-y-5">

      {/* Bannière */}
      <div style={{
        background: `linear-gradient(135deg, ${labColor} 0%, ${labColor}bb 100%)`,
        borderRadius: 20, padding: "22px 26px", color: "white",
        boxShadow: `0 8px 32px ${labColor}35`,
      }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p style={{ opacity: 0.75, fontSize: 12, margin: 0 }}>
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "5px 0 3px", fontFamily: "Georgia,serif" }}>
              {greeting()}, {user?.firstName} 👋
            </h2>
            <p style={{ opacity: 0.7, fontSize: 12, margin: 0 }}>
              {isSA ? "Super Administrateur" : "Administrateur"} — {labName}
            </p>
          </div>

          {/* Statuts délégués en temps réel */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "En visite",      count: dl.filter(d => d.status === "EN_VISITE").length,      color: "#4ade80" },
              { label: "En déplacement", count: dl.filter(d => d.status === "EN_DEPLACEMENT").length, color: "#60a5fa" },
              { label: "En pause",       count: inPause,                                              color: "#fbbf24" },
              { label: "Inactifs",       count: inactive,                                             color: "rgba(255,255,255,0.5)" },
            ].map(({ label, count, color }) => (
              <div key={label} style={{
                textAlign: "center", background: "rgba(255,255,255,0.15)",
                borderRadius: 12, padding: "8px 14px", minWidth: 64,
              }}>
                <p style={{ fontSize: 22, fontWeight: 800, margin: 0, color }}>{count}</p>
                <p style={{ fontSize: 10, opacity: 0.8, margin: 0, whiteSpace: "nowrap" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            {isLoading
              ? <div className="w-16 h-8 bg-gray-100 rounded animate-pulse mb-1" />
              : <p className="text-3xl font-bold mb-0.5" style={{ color }}>
                  {value != null ? Number(value).toLocaleString() : "0"}
                </p>
            }
            <p className="text-sm font-semibold text-gray-700">{label}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Vue par labo — Super Admin en mode global uniquement */}
      {isSA && isGlobal && stats?.byLab && stats.byLab.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-600" />
            Comparaison par laboratoire
          </h3>
          <div className="space-y-3">
            {(stats.byLab as any[]).map((lab: any) => {
              const pct = stats.totalDelegates > 0 ? Math.round(lab.delegates / stats.totalDelegates * 100) : 0;
              return (
                <div key={lab.name} className="flex items-center gap-4">
                  <div className="w-28 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{lab.name.toUpperCase()}</p>
                    <p className="text-xs text-gray-400">{lab.delegates} délégués</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-3 text-xs text-gray-500 mb-1 justify-between">
                      <span>{lab.active} actifs</span>
                      <span>{lab.reports} rapports</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{
                        width: `${pct}%`,
                        background: labColor,
                      }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-500 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grille : délégués + rapports récents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Délégués temps réel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            Délégués — temps réel
            <span className="ml-auto text-xs text-gray-400 font-normal">actualisation 15s</span>
          </h3>
          {dl.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucun délégué</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {dl.map((d: any) => {
                const color = STATUS_COLORS[d.status] || "#9ca3af";
                return (
                  <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-100"
                      style={{ background: d.user?.avatar ? "transparent" : labColor + "25" }}>
                      {d.user?.avatar
                        ? <img src={d.user.avatar} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs font-bold"
                            style={{ color: labColor }}>
                            {d.user?.firstName?.[0]}{d.user?.lastName?.[0]}
                          </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {d.user?.firstName} {d.user?.lastName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{d.zone || "—"}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: color + "18", color }}>
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rapports récents */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
            <TrendingUp size={15} className="text-purple-500" />
            Derniers rapports
          </h3>
          {(recentReports as any[]).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucun rapport récent</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {(recentReports as any[]).map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: labColor + "15" }}>
                    <CheckCircle size={14} style={{ color: labColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {r.delegate?.user?.firstName} {r.delegate?.user?.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {r.specialty === "RAPPORT HEBDOMADAIRE" ? "Rapport hebdomadaire" : `Dr. ${r.doctorName}`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(r.visitDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
