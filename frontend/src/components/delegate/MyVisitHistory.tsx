import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import api          from "../../services/api";

export default function MyVisitHistory() {
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-visit-history"],
    queryFn:  () => api.get("/reports", { params: { limit: 200 } }).then((r) => r.data),
  });

  const reports = (data?.reports || []) as any[];

  const filtered = reports.filter((r) =>
    !search ||
    r.doctorName?.toLowerCase().includes(search.toLowerCase()) ||
    r.pharmacy?.nom?.toLowerCase().includes(search.toLowerCase()) ||
    r.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Historique des Visites</h2>

      {/* Recherche */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          placeholder="Rechercher un médecin, pharmacie..."
        />
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Aucune visite trouvée</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Dr. {r.doctorName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.visitDate).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })}
                      {r.specialty && ` • ${r.specialty}`}
                    </p>
                  </div>
                </div>
                {expanded === r.id
                  ? <ChevronUp   size={16} className="text-gray-400 flex-shrink-0" />
                  : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                }
              </button>

              {expanded === r.id && (
                <div className="px-4 pb-4 border-t border-gray-50 space-y-3">
                  {r.pharmacy && (
                    <div className="flex items-start gap-2 mt-3">
                      <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600">{r.pharmacy.nom}{r.pharmacy.ville ? ` — ${r.pharmacy.ville}` : ""}</p>
                    </div>
                  )}
                  {r.productsShown && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Produits présentés</p>
                      <p className="text-sm text-gray-700">{r.productsShown}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{r.notes}</p>
                  </div>
                  {r.aiSummary && (
                    <div className="bg-purple-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-purple-600 mb-1">✨ Résumé IA</p>
                      <p className="text-sm text-purple-800 leading-relaxed">{r.aiSummary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}