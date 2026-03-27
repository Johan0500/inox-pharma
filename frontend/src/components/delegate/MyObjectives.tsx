import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, CheckCircle } from "lucide-react";
import api          from "../../services/api";
import { useAuth }  from "../../contexts/AuthContext";

export default function MyObjectives() {
  const { user } = useAuth();
  const now      = new Date();
  const month    = `${now.getMonth() + 1}`.padStart(2, "0");
  const year     = now.getFullYear();

  const { data: objective, isLoading } = useQuery({
    queryKey: ["my-objective", month, year],
    queryFn:  () => user?.delegate?.id
      ? api.get(`/objectives/${user.delegate.id}`, { params: { month, year } }).then((r) => r.data)
      : Promise.resolve(null),
    enabled: !!user?.delegate?.id,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["my-reports-obj"],
    queryFn:  () => api.get("/reports", { params: { limit: 200 } }).then((r) => r.data.reports || []),
  });

  const startOfMonth = new Date(year, parseInt(month) - 1, 1);
  const endOfMonth   = new Date(year, parseInt(month), 0);

  const thisMonth = (reports as any[]).filter((r) => {
    const d = new Date(r.visitDate);
    return d >= startOfMonth && d <= endOfMonth;
  });

  const achieved = {
    visits:     thisMonth.length,
    reports:    thisMonth.length,
    pharmacies: new Set(thisMonth.filter((r) => r.pharmacyId).map((r) => r.pharmacyId)).size,
  };

  const ProgressBar = ({ label, achieved: a, target: t, color }: {
    label: string; achieved: number; target: number; color: string;
  }) => {
    const pct = t > 0 ? Math.min(Math.round((a / t) * 100), 100) : 0;
    const done = pct >= 100;
    return (
      <div className={`p-4 rounded-2xl border ${done ? "bg-green-50 border-green-200" : "bg-white border-gray-100"}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {done
              ? <CheckCircle size={16} className="text-green-600" />
              : <Target size={16} className={color} />
            }
            <span className="font-semibold text-gray-800 text-sm">{label}</span>
          </div>
          <span className={`text-lg font-bold ${done ? "text-green-600" : color}`}>{pct}%</span>
        </div>
        <div className="bg-gray-100 rounded-full h-3 mb-2">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: done ? "#16a34a" : color }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{a} réalisé{a > 1 ? "s" : ""}</span>
          <span>Objectif : {t}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Mes Objectifs</h2>
        <p className="text-sm text-gray-400">
          {now.toLocaleString("fr-FR", { month:"long", year:"numeric" })}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Chargement...</div>
      ) : !objective ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center">
          <Target size={32} className="mx-auto mb-2 text-yellow-500" />
          <p className="font-semibold text-yellow-700">Pas encore d'objectifs ce mois</p>
          <p className="text-sm text-yellow-600 mt-1">Votre administrateur n'a pas encore défini vos objectifs pour ce mois.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {objective.targetVisits > 0 && (
            <ProgressBar label="Visites médicales" achieved={achieved.visits} target={objective.targetVisits} color="#2563eb" />
          )}
          {objective.targetReports > 0 && (
            <ProgressBar label="Rapports soumis" achieved={achieved.reports} target={objective.targetReports} color="#7c3aed" />
          )}
          {objective.targetPharmacies > 0 && (
            <ProgressBar label="Pharmacies visitées" achieved={achieved.pharmacies} target={objective.targetPharmacies} color="#16a34a" />
          )}

          {/* Résumé global */}
          <div className="bg-slate-800 rounded-2xl p-4 text-white">
            <p className="font-semibold mb-2 text-sm">Résumé du mois</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-400">{achieved.visits}</p>
                <p className="text-xs text-slate-400">visites</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{achieved.pharmacies}</p>
                <p className="text-xs text-slate-400">pharmacies</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{achieved.reports}</p>
                <p className="text-xs text-slate-400">rapports</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}