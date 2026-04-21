import { useQuery }  from "@tanstack/react-query";
import { FileText, Building2, TrendingUp, Clock, Target, Calendar, ChevronRight } from "lucide-react";
import api           from "../../services/api";
import { useAuth }   from "../../contexts/AuthContext";

export default function MyDashboard() {
  const { user } = useAuth();
  const now    = new Date();
  const month  = `${now.getMonth() + 1}`.padStart(2, "0");
  const year   = now.getFullYear();

  const { data: reportsData } = useQuery({
    queryKey: ["my-reports-dashboard"],
    queryFn:  () => api.get("/reports", { params: { limit: 200 } }).then((r) => r.data.reports || []),
  });

  const { data: objective } = useQuery({
    queryKey: ["my-objective-dashboard"],
    queryFn:  () => (user as any)?.delegate?.id
      ? api.get(`/objectives/${(user as any).delegate.id}`, { params: { month, year } }).then((r) => r.data)
      : Promise.resolve(null),
    enabled: !!(user as any)?.delegate?.id,
  });

  const { data: planning = [] } = useQuery({
    queryKey: ["my-planning-dashboard"],
    queryFn:  () => api.get("/planning/me").then((r) => r.data).catch(() => []),
  });

  const reports = (reportsData || []) as any[];

  const thisMonth = reports.filter((r) => {
    const d = new Date(r.visitDate);
    return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === year;
  });

  const totalVisits      = thisMonth.length;
  const totalPharmacies  = new Set(thisMonth.filter(r => r.pharmacyId).map(r => r.pharmacyId)).size;
  const activeDays       = new Set(thisMonth.map(r => new Date(r.visitDate).toDateString())).size;
  const weekReports      = reports.filter(r => {
    const d = new Date(r.visitDate);
    const now2 = new Date();
    const weekAgo = new Date(now2.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const avatarSrc = user?.avatar;

  return (
    <div className="space-y-4 pb-4">

      {/* Bannière personnalisée */}
      <div style={{
        background: "linear-gradient(135deg, #065f46 0%, #059669 100%)",
        borderRadius: 20, padding: 20, color: "white",
        boxShadow: "0 8px 24px rgba(6,95,70,0.3)",
      }}>
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            overflow: "hidden", border: "2.5px solid rgba(255,255,255,0.4)",
            background: avatarSrc ? "transparent" : "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {avatarSrc
              ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 20, fontWeight: 700 }}>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
            }
          </div>
          <div>
            <p style={{ opacity: 0.75, fontSize: 12, margin: 0 }}>
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "3px 0 2px" }}>
              {greeting()}, {user?.firstName} 👋
            </h2>
            <p style={{ opacity: 0.7, fontSize: 12, margin: 0 }}>
              {(user as any)?.delegate?.sector?.zoneResidence || (user as any)?.delegate?.zone || "Délégué médical"}
            </p>
          </div>
        </div>

        {/* Mini stats dans la bannière */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {[
            { label: "Ce mois", value: totalVisits, icon: "📋" },
            { label: "Cette semaine", value: weekReports, icon: "📅" },
            { label: "Pharmacies", value: totalPharmacies, icon: "🏥" },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              flex: 1, background: "rgba(255,255,255,0.15)", borderRadius: 12,
              padding: "10px 12px", textAlign: "center",
            }}>
              <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{value}</p>
              <p style={{ fontSize: 10, opacity: 0.8, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs du mois */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Visites ce mois",    value: totalVisits,     icon: FileText,   color: "#2563eb", bg: "#eff6ff"   },
          { label: "Pharmacies visitées",value: totalPharmacies, icon: Building2,  color: "#059669", bg: "#f0fdf4"   },
          { label: "Rapports soumis",    value: weekReports,     icon: TrendingUp, color: "#7c3aed", bg: "#f5f3ff", sub: "cette semaine" },
          { label: "Jours actifs",       value: activeDays,      icon: Clock,      color: "#d97706", bg: "#fffbeb"   },
        ].map(({ label, value, icon: Icon, color, bg, sub }: any) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Objectifs */}
      {objective && (objective.targetVisits > 0 || objective.targetPharmacies > 0) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
            <Target size={15} className="text-emerald-600" />
            Objectifs — {now.toLocaleString("fr-FR", { month: "long", year: "numeric" })}
          </h3>
          <div className="space-y-3">
            {objective.targetVisits > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">Visites</span>
                  <span className="font-bold text-blue-600">
                    {totalVisits} / {objective.targetVisits} ({Math.min(Math.round(totalVisits / objective.targetVisits * 100), 100)}%)
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(totalVisits / objective.targetVisits * 100, 100)}%` }} />
                </div>
              </div>
            )}
            {objective.targetPharmacies > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">Pharmacies</span>
                  <span className="font-bold text-emerald-600">
                    {totalPharmacies} / {objective.targetPharmacies} ({Math.min(Math.round(totalPharmacies / objective.targetPharmacies * 100), 100)}%)
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(totalPharmacies / objective.targetPharmacies * 100, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Planning de la semaine */}
      {(planning as any[]).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
            <Calendar size={15} className="text-blue-500" />
            Planning de la semaine
          </h3>
          <div className="space-y-2">
            {(planning as any[]).slice(0, 3).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Calendar size={13} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {p.zone || p.lundi || "Activité planifiée"}
                  </p>
                  <p className="text-xs text-gray-400">Semaine {p.weekNumber}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dernier rapport soumis */}
      {reports[0] && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2">
            <FileText size={15} className="text-purple-500" />
            Dernier rapport soumis
          </h3>
          <div className="flex items-start gap-3 bg-purple-50 rounded-xl p-3">
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText size={15} className="text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm truncate">
                {reports[0].specialty === "RAPPORT HEBDOMADAIRE"
                  ? "Rapport Hebdomadaire"
                  : `Dr. ${reports[0].doctorName}`}
              </p>
              {reports[0].pharmacy && (
                <p className="text-xs text-gray-500 truncate">{reports[0].pharmacy.nom}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(reports[0].visitDate).toLocaleDateString("fr-FR", {
                  day: "2-digit", month: "long", year: "numeric"
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
