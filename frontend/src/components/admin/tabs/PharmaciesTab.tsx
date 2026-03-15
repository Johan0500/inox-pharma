// ════════════════════════════════════════════════════════════════
// FICHIER : frontend/src/components/admin/tabs/PharmaciesTab.tsx
// ════════════════════════════════════════════════════════════════
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Building2 } from "lucide-react";
import api from "../../../services/api";

const GROSSISTES = ["dpci", "copharmed", "laborex", "tedis"];

export function PharmaciesTab() {
  const [search,    setSearch]    = useState("");
  const [grossiste, setGrossiste] = useState("");
  const [page,      setPage]      = useState(1);

  const { data, isLoading } = useQuery<{
  pharmacies: any[];
  total: number;
  page: number;
  pages: number;
}>({
  queryKey: ["pharmacies", { search, grossiste, page }],
  queryFn: () =>
    api.get("/pharmacies", {
      params: {
        search:    search    || undefined,
        grossiste: grossiste || undefined,
        page,
        limit: 50,
      },
    }).then((r) => r.data),
  placeholderData: (prev) => prev,
});
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          Pharmacies{" "}
          <span className="text-gray-400 font-normal text-lg">
            ({data?.total?.toLocaleString() ?? "..."} au total)
          </span>
        </h2>
        <div className="flex gap-2 text-xs">
          {GROSSISTES.map((g) => (
            <span key={g} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
              {g.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Nom, ville, pharmacien, code client..."
          />
        </div>
        <select
          value={grossiste}
          onChange={(e) => { setGrossiste(e.target.value); setPage(1); }}
          className="border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Tous les grossistes</option>
          {GROSSISTES.map((g) => (
            <option key={g} value={g}>{g.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-4 py-3 text-left font-medium">Pharmacie</th>
                <th className="px-4 py-3 text-left font-medium">Pharmacien</th>
                <th className="px-4 py-3 text-left font-medium">Ville / Région</th>
                <th className="px-4 py-3 text-left font-medium">Grossiste</th>
                <th className="px-4 py-3 text-left font-medium">Code / Contact</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 size={32} className="text-gray-300" />
                      <span>Chargement des pharmacies...</span>
                    </div>
                  </td>
                </tr>
              ) : data?.pharmacies?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400">
                    Aucune pharmacie trouvée
                  </td>
                </tr>
              ) : (
                data?.pharmacies?.map((p: any, i: number) => (
                  <tr key={p.id} className={`border-t hover:bg-gray-50 transition ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.nom}</td>
                    <td className="px-4 py-3 text-gray-600">{p.pharmacien || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.ville || "—"}
                      {p.region && p.region !== p.ville && (
                        <span className="text-gray-400 text-xs block">{p.region}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                        {p.grossiste?.name?.toUpperCase() || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.codeClient && <span className="block">#{p.codeClient}</span>}
                      {p.telephone || p.email || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">
              Page {page} / {data.pages} — {data.total.toLocaleString()} résultats
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-white border rounded-xl disabled:opacity-40 hover:bg-gray-100 transition"
              >
                ← Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="px-3 py-1.5 text-sm bg-white border rounded-xl disabled:opacity-40 hover:bg-gray-100 transition"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default PharmaciesTab;
