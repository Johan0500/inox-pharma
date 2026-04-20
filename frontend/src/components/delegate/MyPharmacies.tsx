import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Search, MapPin, Phone, X, ChevronRight } from "lucide-react";
import api from "../../services/api";

export default function MyPharmacies() {
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<any | null>(null);
  const [page, setPage]           = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["pharmacies-delegate", page, search],
    queryFn:  () =>
      api.get("/pharmacies", {
        params: { page, limit: 20, search: search || undefined },
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const pharmacies: any[] = data?.pharmacies || data || [];
  const total: number     = data?.total ?? pharmacies.length;
  const pages: number     = data?.pages ?? 1;

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center gap-2">
        <Building2 size={22} className="text-emerald-600" />
        <h2 className="text-xl font-bold text-gray-800">
          Pharmacies
          <span className="text-gray-400 font-normal text-base ml-2">
            ({total.toLocaleString()} au total)
          </span>
        </h2>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher une pharmacie par nom ou ville…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
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
          <p>Aucune pharmacie trouvée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pharmacies.map((ph: any) => (
            <button
              key={ph.id}
              onClick={() => setSelected(ph)}
              className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-emerald-200 transition flex items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                {/* Icône */}
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition">
                  <Building2 size={18} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{ph.nom}</p>
                  {ph.ville && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} /> {ph.ville}
                      {ph.commune ? ` — ${ph.commune}` : ""}
                    </p>
                  )}
                  {ph.telephone && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Phone size={11} /> {ph.telephone}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 flex-shrink-0 transition" />
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">Page {page} / {pages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm bg-white border rounded-xl disabled:opacity-40 hover:bg-gray-50 transition"
            >
              ← Précédent
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-4 py-2 text-sm bg-white border rounded-xl disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* Modal détail pharmacie */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Building2 size={20} className="text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-800 text-base leading-tight">{selected.nom}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Infos */}
            <div className="p-5 space-y-3">
              {[
                { label: "Ville",      value: selected.ville      },
                { label: "Commune",    value: selected.commune    },
                { label: "Adresse",    value: selected.adresse    },
                { label: "Téléphone",  value: selected.telephone  },
                { label: "Titulaire",  value: selected.titulaire  },
                { label: "Secteur",    value: selected.sector?.zoneResidence || selected.sectorId },
              ]
                .filter((f) => f.value)
                .map(({ label, value }) => (
                  <div key={label} className="flex gap-3 items-start">
                    <span className="text-xs font-semibold text-gray-400 w-24 flex-shrink-0 mt-0.5 uppercase tracking-wide">
                      {label}
                    </span>
                    <span className="text-sm text-gray-800 font-medium">{value}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
