import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";

const GROUP_COLORS: Record<string, { header: string; badge: string }> = {
  "GROUPE 1": { header: "text-blue-700 bg-blue-50",    badge: "bg-blue-100 text-blue-800"    },
  "GROUPE 2": { header: "text-green-700 bg-green-50",  badge: "bg-green-100 text-green-800"  },
  "GROUPE 3": { header: "text-purple-700 bg-purple-50",badge: "bg-purple-100 text-purple-800"},
  "GROUPE 4": { header: "text-orange-700 bg-orange-50",badge: "bg-orange-100 text-orange-800"},
};

export default function MyProducts() {
  const [activeSpec, setActiveSpec] = useState<string | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn:  () => api.get("/products").then((r) => r.data),
  });

  const { data: specialties = [] } = useQuery({
    queryKey: ["specialties"],
    queryFn:  () => api.get("/products/specialties").then((r) => r.data),
  });

  const grouped = (products as any[]).reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = {};
    if (!acc[p.group][p.specialty]) acc[p.group][p.specialty] = [];
    acc[p.group][p.specialty].push(p);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  const filteredProducts = activeSpec ? (products as any[]).filter((p) => p.specialty === activeSpec) : [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Produits INOX PHARMA</h2>

      {/* Filtre */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Filtrer par spécialité</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveSpec(null)}
            className={`text-xs px-3 py-1.5 rounded-full border-2 transition font-medium
              ${!activeSpec ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-600 border-gray-200"}`}>
            Tous
          </button>
          {(specialties as any[]).map((s) => (
            <button key={s.specialty} onClick={() => setActiveSpec(activeSpec === s.specialty ? null : s.specialty)}
              className={`text-xs px-3 py-1.5 rounded-full border-2 transition font-medium
                ${activeSpec === s.specialty ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
              {s.specialty}
            </button>
          ))}
        </div>
      </div>

      {/* Produits filtrés */}
      {activeSpec && filteredProducts.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">{activeSpec}</h3>
          <div className="flex flex-wrap gap-2">
            {filteredProducts.map((p) => (
              <div key={p.id} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl font-semibold shadow-sm">{p.name}</div>
            ))}
          </div>
        </div>
      )}

      {/* Tous les groupes */}
      {!activeSpec && Object.entries(grouped).map(([group, specs]) => {
        const style = GROUP_COLORS[group] || { header: "text-gray-700 bg-gray-50", badge: "bg-gray-100 text-gray-700" };
        return (
          <div key={group} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className={`px-4 py-3 ${style.header}`}>
              <p className="font-bold text-sm">{group}</p>
            </div>
            <div className="p-4 space-y-3">
              {Object.entries(specs).map(([specialty, prods]) => (
                <div key={specialty}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{specialty}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(prods as any[]).map((p) => (
                      <span key={p.id} className={`text-xs px-3 py-1 rounded-full font-semibold ${style.badge}`}>{p.name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
