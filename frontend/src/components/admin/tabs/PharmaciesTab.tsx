import { useState }                              from "react";
import { useQuery, useQueryClient }              from "@tanstack/react-query";
import { Building2, Search, Filter, X, MapPin, RefreshCw } from "lucide-react";
import api from "../../../services/api";

const GROSSISTE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  copharmed: { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500"   },
  laborex:   { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500"  },
  tedis:     { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  dpci:      { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500"    },
};

export default function PharmaciesTab() {
  const qc = useQueryClient();
  const [search,   setSearch]   = useState("");
  const [grossiste,setGrossite] = useState("all");
  const [zone,     setZone]     = useState("all");
  const [ville,    setVille]    = useState("all");
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState<any>(null);

  const params = { search, grossiste, zone, ville, page, limit: 50 };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["pharmacies", params],
    queryFn:  () => api.get("/pharmacies", { params }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: filters } = useQuery({
    queryKey: ["pharmacy-filters"],
    queryFn:  () => api.get("/pharmacies/filters").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: stats } = useQuery({
    queryKey: ["pharmacy-stats"],
    queryFn:  () => api.get("/pharmacies/stats").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const pharmacies = data?.pharmacies || [];
  const total      = data?.total      || 0;
  const pages      = data?.pages      || 1;

  const resetFilters = () => {
    setSearch(""); setGrossite("all"); setZone("all"); setVille("all"); setPage(1);
  };

  const hasFilters = search || grossiste !== "all" || zone !== "all" || ville !== "all";

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Building2 size={22} className="text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Pharmacies</h2>
            <p className="text-sm text-gray-400">{total.toLocaleString()} pharmacies au total</p>
          </div>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ["pharmacies"] })}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-xl transition"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {/* Stats par grossiste */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(stats.byGrossiste || []).map((g: any) => {
            const key    = g.grossiste.toLowerCase();
            const colors = GROSSISTE_COLORS[key] || { bg:"bg-gray-50", text:"text-gray-700", dot:"bg-gray-400" };
            return (
              <button
                key={g.grossiste}
                onClick={() => { setGrossite(grossiste === key ? "all" : key); setPage(1); }}
                className={`${colors.bg} rounded-2xl p-4 text-left hover:shadow-md transition cursor-pointer border-2
                  ${grossiste === key ? "border-current shadow-md" : "border-transparent"}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} mb-2`} />
                <p className={`text-xs font-bold ${colors.text} uppercase`}>{g.grossiste}</p>
                <p className={`text-2xl font-bold ${colors.text}`}>{g.count.toLocaleString()}</p>
                <p className="text-xs text-gray-400">pharmacies</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3">
          {/* Recherche */}
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full border rounded-xl pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Rechercher une pharmacie..."
            />
          </div>

          {/* Grossiste */}
          <select value={grossiste} onChange={(e) => { setGrossite(e.target.value); setPage(1); }}
            className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
            <option value="all">Tous grossistes</option>
            {(filters?.grossistes || ["copharmed","laborex","tedis","dpci"]).map((g: string) => (
              <option key={g} value={g.toLowerCase()}>{g.toUpperCase()}</option>
            ))}
          </select>

          {/* Zone */}
          <select value={zone} onChange={(e) => { setZone(e.target.value); setPage(1); }}
            className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
            <option value="all">Toutes zones</option>
            {(filters?.zones || []).map((z: string) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>

          {/* Ville */}
          <select value={ville} onChange={(e) => { setVille(e.target.value); setPage(1); }}
            className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
            <option value="all">Toutes villes</option>
            {(filters?.villes || []).map((v: string) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {/* Reset */}
          {hasFilters && (
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm px-3 py-2 border border-red-200 rounded-xl bg-red-50 hover:bg-red-100 transition">
              <X size={14} /> Réinitialiser
            </button>
          )}
        </div>

        {/* Résumé filtres actifs */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">Filtres actifs :</span>
            {search    && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">"{search}"</span>}
            {grossiste !== "all" && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{grossiste.toUpperCase()}</span>}
            {zone      !== "all" && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{zone}</span>}
            {ville     !== "all" && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{ville}</span>}
            <span className="text-xs text-gray-500 font-medium">{total.toLocaleString()} résultat(s)</span>
          </div>
        )}
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Chargement...
          </div>
        ) : pharmacies.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="font-medium">Aucune pharmacie trouvée</p>
            {hasFilters && <button onClick={resetFilters} className="text-green-600 text-sm mt-2 hover:underline">Réinitialiser les filtres</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-4 py-3 text-left font-medium">Pharmacie</th>
                  <th className="px-4 py-3 text-left font-medium">Zone</th>
                  <th className="px-4 py-3 text-left font-medium">Ville</th>
                  <th className="px-4 py-3 text-left font-medium">Grossiste</th>
                  <th className="px-4 py-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pharmacies.map((p: any, i: number) => {
                  const key    = (p.grossiste?.name || "").toLowerCase();
                  const colors = GROSSISTE_COLORS[key] || { bg:"bg-gray-50", text:"text-gray-600", dot:"bg-gray-400" };
                  return (
                    <tr key={p.id} className={`border-t hover:bg-gray-50 transition ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                      <td className="px-4 py-3 font-medium text-gray-800">{p.nom}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.region || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.ville  || "—"}</td>
                      <td className="px-4 py-3">
                        {p.grossiste ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.bg} ${colors.text}`}>
                            {p.grossiste.name.toUpperCase()}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelected(p)}
                          className="text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Page {page} sur {pages} — {total.toLocaleString()} pharmacies
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 text-sm border rounded-xl disabled:opacity-40 hover:bg-gray-50 transition">
              ← Précédent
            </button>
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, pages - 4)) + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 text-sm rounded-xl transition font-medium
                    ${p === page ? "bg-green-600 text-white" : "border hover:bg-gray-50"}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-4 py-2 text-sm border rounded-xl disabled:opacity-40 hover:bg-gray-50 transition">
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Building2 size={18} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{selected.nom}</h3>
                  {selected.grossiste && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                      ${GROSSISTE_COLORS[selected.grossiste.name.toLowerCase()]?.bg || "bg-gray-50"}
                      ${GROSSISTE_COLORS[selected.grossiste.name.toLowerCase()]?.text || "text-gray-600"}`}>
                      {selected.grossiste.name.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Zone",        value: selected.region     },
                { label: "Ville",       value: selected.ville      },
                { label: "Pharmacien",  value: selected.pharmacien },
                { label: "Adresse",     value: selected.adresse    },
                { label: "Téléphone",   value: selected.telephone  },
                { label: "Code client", value: selected.codeClient },
              ].filter((i) => i.value).map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
