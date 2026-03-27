import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BarChart3 } from "lucide-react";
import api           from "../../services/api";

const COLORS = ["#2563eb","#16a34a","#d97706","#dc2626","#7c3aed","#0891b2"];

export default function MyStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-stats"],
    queryFn:  () => api.get("/reports", { params: { limit: 200 } }).then((r) => r.data),
  });

  const reports = (data?.reports || []) as any[];

  // Visites par mois (6 derniers mois)
  const visitsByMonth: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d    = new Date();
    d.setMonth(d.getMonth() - i);
    const key  = d.toLocaleString("fr-FR", { month: "short", year: "2-digit" });
    visitsByMonth[key] = 0;
  }
  reports.forEach((r) => {
    const d   = new Date(r.visitDate);
    const key = d.toLocaleString("fr-FR", { month: "short", year: "2-digit" });
    if (key in visitsByMonth) visitsByMonth[key]++;
  });
  const monthlyData = Object.entries(visitsByMonth).map(([name, value]) => ({ name, value }));

  // Top spécialités
  const bySpecialty: Record<string, number> = {};
  reports.forEach((r) => {
    const s = r.specialty || "Non défini";
    bySpecialty[s] = (bySpecialty[s] || 0) + 1;
  });
  const specialtyData = Object.entries(bySpecialty)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Top produits présentés
  const byProduct: Record<string, number> = {};
  reports.forEach((r) => {
    if (!r.productsShown) return;
    r.productsShown.split(",").forEach((p: string) => {
      const t = p.trim();
      if (t) byProduct[t] = (byProduct[t] || 0) + 1;
    });
  });
  const productData = Object.entries(byProduct)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (isLoading) return <div className="text-center py-8 text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 size={20} className="text-blue-600" />
        <h2 className="text-xl font-bold text-gray-800">Mes Statistiques</h2>
      </div>

      {/* Visites par mois */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Visites par mois</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#2563eb" radius={[4,4,0,0]} name="Visites" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top spécialités */}
      {specialtyData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm">Spécialités visitées</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={specialtyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {specialtyData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top produits */}
      {productData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Top produits présentés</h3>
          <div className="space-y-2">
            {productData.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 font-medium truncate">{name}</span>
                    <span className="text-gray-500 flex-shrink-0 ml-2">{count}x</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${(count / productData[0][1]) * 100}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total global */}
      <div className="bg-slate-800 rounded-2xl p-4 text-white">
        <p className="text-sm font-semibold mb-3">Bilan global</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-400">{reports.length}</p>
            <p className="text-xs text-slate-400">visites totales</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">
              {new Set(reports.filter((r) => r.pharmacyId).map((r) => r.pharmacyId)).size}
            </p>
            <p className="text-xs text-slate-400">pharmacies</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">
              {new Set(reports.map((r) => r.specialty).filter(Boolean)).size}
            </p>
            <p className="text-xs text-slate-400">spécialités</p>
          </div>
        </div>
      </div>
    </div>
  );
}