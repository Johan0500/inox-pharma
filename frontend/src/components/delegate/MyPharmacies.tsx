import { useState }   from "react";
import { useQuery }   from "@tanstack/react-query";
import { Building2, Search, MapPin, Phone, X, ChevronRight, RefreshCw } from "lucide-react";
import api from "../../services/api";

const GROSSISTE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  copharmed: { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500"   },
  laborex:   { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500"  },
  tedis:     { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  dpci:      { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500"    },
};

export default function MyPharmacies() {
  const [search,    setSearch]    = useState("");
  const [grossiste, setGrossite]  = useState("all");
  const [zone,      setZone]      = useState("all");
  const [page,      setPage]      = useState(1);
  const [selected,  setSelected]  = useState<any | null>(null);

  const params = { search, grossiste, zone, page, limit: 50 };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["pharmacies-delegate", params],
    queryFn:  () => api.get("/pharmacies", { params }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  // Filtres (grossistes + zones sans doublons)
  const { data: filters } = useQuery({
    queryKey: ["pharmacy-filters"],
    queryFn:  () => api.get("/pharmacies/filters").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // Stats grossistes
  const { data: stats } = useQuery({
    queryKey: ["pharmacy-stats"],
    queryFn:  () => api.get("/pharmacies/stats").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const pharmacies: any[] = data?.pharmacies || [];
  const total: number     = data?.total ?? 0;
  const pages: number     = data?.pages ?? 1;

  // Dédupliquer grossistes et zones
  const grossistes: string[] = [...new Set<string>((filters?.grossistes || []).map((g: string) => g.toLowerCase()))];
  const zones: string[]      = [...new Set<string>((filters?.zones || []).filter(Boolean))];

  const hasFilters = search || grossiste !== "all" || zone !== "all";
  const resetFilters = () => { setSearch(""); setGrossite("all"); setZone("all"); setPage(1); };

  return (
    <div className="space-y-4">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={22} className="text-emerald-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">Pharmacies</h2>
            <p className="text-xs text-gray-400">{total.toLocaleString()} pharmacies au total</p>
          </div>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-xl transition">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Stats grossistes (cliquables) */}
      {stats?.byGrossiste && stats.byGrossiste.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {stats.byGrossiste.map((g: any) => {
            const key    = g.grossiste.toLowerCase();
            const colors = GROSSISTE_COLORS[key] || { bg:"bg-gray-50", text:"text-gray-700", dot:"bg-gray-400" };
            const isActive = grossiste === key;
            return (
              <button key={g.grossiste}
                onClick={() => { setGrossite(isActive ? "all" : key); setPage(1); }}
                className={`${colors.bg} rounded-2xl p-4 text-left transition border-2 ${isActive ? "border-current shadow-md" : "border-transparent hover:shadow-sm"}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} mb-2`} />
                <p className={`text-xs font-bold uppercase ${colors.text}`}>{g.grossiste}</p>
                <p className={`text-2xl font-bold ${colors.text}`}>{g.count.toLocaleString()}</p>
                <p className="text-xs text-gray-400">pharmacies</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        {/* Recherche */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher une pharmacie…"
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Selects grossiste + zone */}
        <div className="flex flex-wrap gap-2">
          {/* Grossiste */}
          {grossistes.length > 0 && (
            <select value={grossiste} onChange={(e) => { setGrossite(e.target.value); setPage(1); }}
              className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none flex-1 min-w-[140px]">
              <option value="all">Tous grossistes</option>
              {grossistes.map((g) => (
                <option key={g} value={g}>{g.toUpperCase()}</option>
              ))}
            </select>
          )}
          {/* Zone */}
          {zones.length > 0 && (
            <select value={zone} onChange={(e) => { setZone(e.target.value); setPage(1); }}
              className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none flex-1 min-w-[140px]">
              <option value="all">Toutes zones</option>
              {zones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          )}
          {hasFilters && (
            <button onClick={resetFilters}
              className="flex items-center gap-1 text-red-500 text-sm border border-red-200 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition">
              <X size={13} /> Réinitialiser
            </button>
          )}
        </div>

        {/* Filtres actifs */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
            <span className="text-xs text-gray-400">Filtres :</span>
            {search     && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">"{search}"</span>}
            {grossiste !== "all" && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{grossiste.toUpperCase()}</span>}
            {zone !== "all"      && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{zone}</span>}
            <span className="text-xs text-gray-500 font-medium">{total.toLocaleString()} résultat(s)</span>
          </div>
        )}
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Chargement…
        </div>
      ) : pharmacies.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
          <Building2 size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Aucune pharmacie trouvée</p>
          {hasFilters && <button onClick={resetFilters} className="text-emerald-600 text-sm mt-2 hover:underline">Réinitialiser les filtres</button>}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {pharmacies.map((ph: any) => {
                const gKey   = (ph.grossiste?.name || "").toLowerCase();
                const colors = GROSSISTE_COLORS[gKey] || { bg:"bg-gray-50", text:"text-gray-600", dot:"bg-gray-400" };
                return (
                  <button key={ph.id} onClick={() => setSelected(ph)}
                    className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition flex items-center justify-between gap-3 group">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition">
                        <Building2 size={16} className="text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{ph.nom}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {ph.region && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <MapPin size={10} /> {ph.region}
                            </span>
                          )}
                          {ph.grossiste && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${colors.bg} ${colors.text}`}>
                              {ph.grossiste.name.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-gray-300 group-hover:text-emerald-500 flex-shrink-0 transition" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Page {page} / {pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-4 py-2 text-sm bg-white border rounded-xl disabled:opacity-40 hover:bg-gray-50 transition">← Précédent</button>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                  className="px-4 py-2 text-sm bg-white border rounded-xl disabled:opacity-40 hover:bg-gray-50 transition">Suivant →</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal détail — lecture seule */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Building2 size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{selected.nom}</h3>
                  {selected.grossiste && (() => {
                    const k = selected.grossiste.name.toLowerCase();
                    const c = GROSSISTE_COLORS[k] || { bg:"bg-gray-50", text:"text-gray-600" };
                    return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.bg} ${c.text}`}>{selected.grossiste.name.toUpperCase()}</span>;
                  })()}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: "Zone",        value: selected.region     },
                { label: "Ville",       value: selected.ville      },
                { label: "Pharmacien",  value: selected.pharmacien },
                { label: "Adresse",     value: selected.adresse    },
                { label: "Téléphone",   value: selected.telephone  },
                { label: "Code client", value: selected.codeClient },
              ].filter((f) => f.value).map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))}
              {selected.telephone && (
                <a href={`tel:${selected.telephone}`}
                  className="flex items-center justify-center gap-2 w-full mt-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-2.5 rounded-xl text-sm transition"
                  onClick={(e) => e.stopPropagation()}>
                  <Phone size={15} /> Appeler
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
