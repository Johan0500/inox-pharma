import { useQuery }  from "@tanstack/react-query";
import { FileText, MapPin, Building2, TrendingUp, Clock } from "lucide-react";
import api           from "../../services/api";
import { useAuth }   from "../../contexts/AuthContext";

export default function MyDashboard() {
  const { user } = useAuth();
  const now      = new Date();
  const month    = `${now.getMonth() + 1}`.padStart(2, "0");
  const year     = now.getFullYear();

  const { data: reports = [] } = useQuery({
    queryKey: ["my-reports-dashboard"],
    queryFn:  () => api.get("/reports", { params: { limit: 100 } }).then((r) => r.data.reports || []),
  });

  const { data: objective } = useQuery({
    queryKey: ["my-objective-dashboard"],
    queryFn:  () => user?.delegate?.id
      ? api.get(`/objectives/${user.delegate.id}`, { params: { month, year } }).then((r) => r.data)
      : Promise.resolve(null),
    enabled: !!user?.delegate?.id,
  });

  const thisMonth = (reports as any[]).filter((r) => {
    const d = new Date(r.visitDate);
    return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === year;
  });

  const totalVisits     = thisMonth.length;
  const totalPharmacies = new Set(thisMonth.filter((r) => r.pharmacyId).map((r) => r.pharmacyId)).size;
  const lastVisit       = (reports as any[])[0];

  const ProgressBar = ({ value, max, color = "#2563eb" }: { value: number; max: number; color?: string }) => {
    const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
    return (
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">{value} / {max}</span>
          <span className="font-semibold" style={{ color }}>{pct}%</span>
        </div>
        <div className="bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">
          Bonjour, {user?.firstName} 👋
        </h2>
        <p className="text-sm text-gray-400">
          {now.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })}
        </p>
      </div>

      {/* KPIs du mois */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Visites ce mois",    value: totalVisits,     icon: FileText,   color: "text-blue-600",   bg: "bg-blue-50"   },
          { label: "Pharmacies visitées",value: totalPharmacies, icon: Building2,  color: "text-green-600",  bg: "bg-green-50"  },
          { label: "Rapports soumis",    value: totalVisits,     icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Jours actifs",       value: new Set(thisMonth.map((r) => new Date(r.visitDate).toDateString())).size,
            icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={color} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Objectifs du mois */}
      {objective && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" />
            Mes objectifs — {now.toLocaleString("fr-FR", { month:"long" })}
          </h3>
          <div className="space-y-3">
            {objective.targetVisits > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Visites</p>
                <ProgressBar value={totalVisits} max={objective.targetVisits} color="#2563eb" />
              </div>
            )}
            {objective.targetPharmacies > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Pharmacies</p>
                <ProgressBar value={totalPharmacies} max={objective.targetPharmacies} color="#16a34a" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dernière visite */}
      {lastVisit && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-2 text-sm">Dernière visite</h3>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm truncate">Dr. {lastVisit.doctorName}</p>
              {lastVisit.pharmacy && (
                <p className="text-xs text-gray-500 truncate">{lastVisit.pharmacy.nom}</p>
              )}
              <p className="text-xs text-gray-400">
                {new Date(lastVisit.visitDate).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}