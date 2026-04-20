import { useState } from "react";
import { useQuery }  from "@tanstack/react-query";
import { Package, Search, X, ChevronRight, Layers } from "lucide-react";
import api from "../../services/api";

const GROUP_COLORS: Record<string, { header: string; badge: string; dot: string }> = {
  "GROUPE 1": { header: "text-blue-700 bg-blue-50 border-blue-100",     badge: "bg-blue-100 text-blue-800",     dot: "#2563eb" },
  "GROUPE 2": { header: "text-green-700 bg-green-50 border-green-100",   badge: "bg-green-100 text-green-800",   dot: "#16a34a" },
  "GROUPE 3": { header: "text-purple-700 bg-purple-50 border-purple-100",badge: "bg-purple-100 text-purple-800", dot: "#7c3aed" },
  "GROUPE 4": { header: "text-orange-700 bg-orange-50 border-orange-100",badge: "bg-orange-100 text-orange-800", dot: "#ea580c" },
};
const DEFAULT_COLOR = { header: "text-gray-700 bg-gray-50 border-gray-100", badge: "bg-gray-100 text-gray-700", dot: "#6b7280" };

export default function MyProducts() {
  const [search,      setSearch]      = useState("");
  const [activeSpec,  setActiveSpec]  = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selected,    setSelected]    = useState<any | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn:  () => api.get("/products").then((r) => r.data),
  });

  const { data: specialties = [] } = useQuery({
    queryKey: ["specialties"],
    queryFn:  () => api.get("/products/specialties").then((r) => r.data),
  });

  const filtered = (products as any[]).filter((p) => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.specialty?.toLowerCase().includes(search.toLowerCase()) ||
      p.group?.toLowerCase().includes(search.toLowerCase());
    const matchSpec  = !activeSpec  || p.specialty === activeSpec;
    const matchGroup = !activeGroup || p.group     === activeGroup;
    return matchSearch && matchSpec && matchGroup;
  });

  const grouped = filtered.reduce((acc: Record<string, Record<string, any[]>>, p) => {
    const g = p.group || "Sans groupe";
    const s = p.specialty || "Sans spécialité";
    if (!acc[g]) acc[g] = {};
    if (!acc[g][s]) acc[g][s] = [];
    acc[g][s].push(p);
    return acc;
  }, {});

  const groups = [...new Set((products as any[]).map((p: any) => p.group).filter(Boolean))];
  const hasFilters = !!search || !!activeSpec || !!activeGroup;

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={22} className="text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-800">Produits INOX PHARMA</h2>
        </div>
        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold px-3 py-1 rounded-full">
          {(products as any[]).length} produits
        </span>
      </div>

      {/* Recherche + Filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit, spécialité, groupe…"
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {groups.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Groupe</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveGroup(null)}
                className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition ${!activeGroup ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-600 border-gray-200"}`}>
                Tous
              </button>
              {groups.map((g) => {
                const style = GROUP_COLORS[g] || DEFAULT_COLOR;
                const isActive = activeGroup === g;
                return (
                  <button key={g} onClick={() => setActiveGroup(isActive ? null : g)}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition flex items-center gap-1.5 ${isActive ? style.badge + " border-current" : "bg-white text-gray-600 border-gray-200"}`}>
                    <span className="w-2 h-2 rounded-full" style={{ background: style.dot }} />
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(specialties as any[]).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Spécialité</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveSpec(null)}
                className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition ${!activeSpec ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-600 border-gray-200"}`}>
                Toutes
              </button>
              {(specialties as any[]).map((s) => (
                <button key={s.specialty} onClick={() => setActiveSpec(activeSpec === s.specialty ? null : s.specialty)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition ${activeSpec === s.specialty ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"}`}>
                  {s.specialty}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasFilters && (
          <button onClick={() => { setSearch(""); setActiveSpec(null); setActiveGroup(null); }}
            className="flex items-center gap-1.5 text-xs text-red-500 border border-red-200 bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100 transition font-medium">
            <X size={12} /> Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Chargement…
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
          <Package size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Aucun produit trouvé</p>
          {hasFilters && <p className="text-xs mt-1">Essayez de modifier vos filtres</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Résumé */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-600 rounded-2xl p-4 text-white">
              <p className="text-2xl font-bold">{filtered.length}</p>
              <p className="text-xs text-emerald-100 mt-0.5">{hasFilters ? "produits filtrés" : "produits total"}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-gray-800">{Object.keys(grouped).length}</p>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Layers size={11} /> groupes actifs</p>
            </div>
          </div>

          {/* Groupes */}
          {Object.entries(grouped).map(([group, specs]) => {
            const style = GROUP_COLORS[group] || DEFAULT_COLOR;
            const totalInGroup = Object.values(specs).flat().length;
            return (
              <div key={group} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`px-5 py-3 border-b ${style.header} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: style.dot }} />
                    <p className="font-bold text-sm">{group}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                    {totalInGroup} produit{totalInGroup > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  {Object.entries(specs as Record<string, any[]>).map(([specialty, prods]) => (
                    <div key={specialty}>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{specialty}</p>
                      <div className="flex flex-wrap gap-2">
                        {prods.map((p) => (
                          <button key={p.id} onClick={() => setSelected(p)}
                            className={`text-sm px-4 py-2 rounded-xl font-semibold shadow-sm flex items-center gap-1.5 hover:opacity-80 active:scale-95 transition ${style.badge}`}>
                            {p.name}
                            <ChevronRight size={13} className="opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal détail */}
      {selected && (() => {
        const style = GROUP_COLORS[selected.group] || DEFAULT_COLOR;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className={`px-5 py-5 ${style.header} border-b`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-lg leading-tight">{selected.name}</p>
                    {selected.group && (
                      <span className={`inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>{selected.group}</span>
                    )}
                  </div>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 mt-0.5"><X size={20} /></button>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: "Spécialité",       value: selected.specialty       },
                  { label: "DCI",              value: selected.dci             },
                  { label: "Dosage",           value: selected.dosage          },
                  { label: "Forme",            value: selected.forme           },
                  { label: "Conditionnement",  value: selected.conditionnement },
                  { label: "Description",      value: selected.description     },
                ].filter((f) => f.value).map(({ label, value }) => (
                  <div key={label} className="flex gap-3 items-start">
                    <span className="text-xs font-semibold text-gray-400 w-32 flex-shrink-0 uppercase tracking-wide mt-0.5">{label}</span>
                    <span className="text-sm text-gray-800 font-medium">{value}</span>
                  </div>
                ))}
                {![selected.specialty, selected.dci, selected.dosage, selected.forme].some(Boolean) && (
                  <p className="text-sm text-gray-400 italic text-center py-2">Aucune information complémentaire disponible</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
