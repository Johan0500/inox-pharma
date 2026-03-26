import { useState }                              from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, TrendingUp, Edit2, Check }      from "lucide-react";
import api from "../../../services/api";

export default function ObjectivesTab() {
  const qc  = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(`${now.getMonth() + 1}`.padStart(2, "0"));
  const [year,  setYear]  = useState(now.getFullYear());
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ targetVisits: 0, targetReports: 0, targetPharmacies: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ["objectives", month, year],
    queryFn:  () => api.get("/objectives", { params: { month, year } }).then((r) => r.data),
  });

  const saveObjective = useMutation({
    mutationFn: (d: any) => api.post("/objectives", d),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["objectives"] });
      setEditing(null);
    },
  });

  const ProgressBar = ({ value, color = "bg-blue-500" }: { value: number | null; color?: string }) => {
    if (value === null) return <span className="text-xs text-gray-400">Pas d'objectif</span>;
    const pct = Math.min(value, 100);
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${pct >= 100 ? "bg-green-500" : pct >= 70 ? color : "bg-red-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs font-semibold ${pct >= 100 ? "text-green-600" : pct >= 70 ? "text-blue-600" : "text-red-500"}`}>
          {value}%
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target size={22} className="text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Objectifs Mensuels</h2>
        </div>
        <div className="flex gap-3">
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            {Array.from({length:12},(_,i)=>(
              <option key={i+1} value={`${i+1}`.padStart(2,"0")}>
                {new Date(2024,i).toLocaleString("fr-FR",{month:"long"})}
              </option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
            className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            {[2024,2025,2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : (
        <div className="space-y-4">
          {(data?.data || []).map((item: any) => (
            <div key={item.delegate.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800">{item.delegate.name}</h3>
                  <p className="text-xs text-gray-400">{item.delegate.zone} — {item.delegate.laboratory}</p>
                </div>
                <button
                  onClick={() => {
                    setEditing(item.delegate.id);
                    setEditForm({
                      targetVisits:     item.objective?.targetVisits     || 0,
                      targetReports:    item.objective?.targetReports    || 0,
                      targetPharmacies: item.objective?.targetPharmacies || 0,
                    });
                  }}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Edit2 size={14} />
                  {item.objective ? "Modifier" : "Définir objectif"}
                </button>
              </div>

              {editing === item.delegate.id && (
                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: "targetVisits",     label: "Visites" },
                      { key: "targetReports",    label: "Rapports" },
                      { key: "targetPharmacies", label: "Pharmacies" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                        <input
                          type="number"
                          value={(editForm as any)[key]}
                          onChange={(e) => setEditForm((f) => ({ ...f, [key]: parseInt(e.target.value) || 0 }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          min="0"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => saveObjective.mutate({
                        delegateId: item.delegate.id, month, year, ...editForm,
                      })}
                      disabled={saveObjective.isPending}
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      <Check size={14} />
                      {saveObjective.isPending ? "Sauvegarde..." : "Enregistrer"}
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition">
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Visites",    achieved: item.achieved.visits,    target: item.objective?.targetVisits,    progress: item.progress?.visits    },
                  { label: "Rapports",   achieved: item.achieved.reports,   target: item.objective?.targetReports,   progress: item.progress?.reports   },
                  { label: "Pharmacies", achieved: item.achieved.pharmacies, target: item.objective?.targetPharmacies,progress: item.progress?.pharmacies },
                ].map(({ label, achieved, target, progress }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{label}</span>
                      <span className="text-xs text-gray-500">
                        {achieved}{target ? ` / ${target}` : ""}
                      </span>
                    </div>
                    <ProgressBar value={progress ?? null} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {(data?.data || []).length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
              Aucun délégué trouvé
            </div>
          )}
        </div>
      )}
    </div>
  );
}