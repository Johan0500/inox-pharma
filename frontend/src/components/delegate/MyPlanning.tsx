import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { Calendar } from "lucide-react";

const DAYS = ["lundi","mardi","mercredi","jeudi","vendredi"] as const;
const DAY_LABELS = ["Lun","Mar","Mer","Jeu","Ven"];

export default function MyPlanning() {
  const { user } = useAuth();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["planning-delegate"],
    queryFn:  () => api.get("/planning").then((r) => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-48 text-gray-400">Chargement du planning...</div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Mon Planning</h2>
      <p className="text-sm text-gray-500">Zone : {user?.delegate?.zone || "—"}</p>

      {(plans as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm border border-gray-100">
          <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Aucun planning disponible</p>
          <p className="text-xs mt-1">Contactez votre administrateur</p>
        </div>
      ) : (
        (plans as any[]).map((plan) => (
          <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Semaine {plan.weekNumber}</h3>
              <span className="text-slate-400 text-xs">{plan.zone} — {plan.month}</span>
            </div>
            <div className="overflow-x-auto">
              <div className="flex min-w-max">
                {DAYS.map((day, i) => (
                  <div key={day} className="flex-1 min-w-[130px] border-r last:border-r-0">
                    <div className="bg-blue-50 px-3 py-2 text-center">
                      <p className="text-xs font-bold text-blue-700">{DAY_LABELS[i]}</p>
                    </div>
                    <div className="p-2 space-y-1 min-h-[80px]">
                      {plan[day]
                        ? plan[day].split("\n").filter(Boolean).map((line: string, j: number) => (
                            <div key={j} className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded-lg leading-tight">{line}</div>
                          ))
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
