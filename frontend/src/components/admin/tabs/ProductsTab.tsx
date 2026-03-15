import { useQuery } from "@tanstack/react-query";
import api from "../../../services/api";

const GROUP_STYLES: Record<string, { header: string; badge: string }> = {
  "GROUPE 1": { header: "bg-blue-700",   badge: "bg-blue-100 text-blue-800 border-blue-200" },
  "GROUPE 2": { header: "bg-green-700",  badge: "bg-green-100 text-green-800 border-green-200" },
  "GROUPE 3": { header: "bg-purple-700", badge: "bg-purple-100 text-purple-800 border-purple-200" },
  "GROUPE 4": { header: "bg-orange-700", badge: "bg-orange-100 text-orange-800 border-orange-200" },
};

export default function ProductsTab() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn:  () => api.get("/products").then((r) => r.data),
  });

  // Grouper par groupe puis par spécialité
  const grouped = (products as any[]).reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = {};
    if (!acc[p.group][p.specialty]) acc[p.group][p.specialty] = [];
    acc[p.group][p.specialty].push(p);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Chargement des produits...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          Stratégie Produits
        </h2>
        <span className="text-sm text-gray-400">
          Source : STRATEGIE_I_Par_Spécialété.xlsx — {products.length} produits
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(grouped).map(([group, specs]) => {
          const style = GROUP_STYLES[group] || { header: "bg-slate-700", badge: "bg-gray-100 text-gray-700 border-gray-200" };
          return (
            <div key={group} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className={`${style.header} px-5 py-3`}>
                <h3 className="font-bold text-white">{group}</h3>
                <p className="text-white/60 text-xs">
                  {Object.keys(specs).length} spécialité(s) —{" "}
                  {Object.values(specs).flat().length} produit(s)
                </p>
              </div>
              <div className="p-4 space-y-4">
                {Object.entries(specs).map(([specialty, prods]) => (
                  <div key={specialty}>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      {specialty}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(prods as any[]).map((p) => (
                        <span
                          key={p.id}
                          className={`text-xs px-3 py-1 rounded-full border font-semibold ${style.badge}`}
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
