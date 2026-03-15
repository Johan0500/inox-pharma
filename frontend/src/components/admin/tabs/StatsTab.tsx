import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import api from "../../../services/api";

const COLORS = ["#0066CC","#00A86B","#F59E0B","#E74C3C","#8B5CF6","#06B6D4"];

export default function StatsTab() {
  const { data: stats } = useQuery({
    queryKey: ["stats-dashboard"],
    queryFn:  () => api.get("/stats/dashboard").then((r) => r.data),
  });

  const { data: pharmacyStats = [] } = useQuery({
    queryKey: ["pharmacy-stats"],
    queryFn:  () => api.get("/pharmacies/stats").then((r) => r.data),
  });

  const pieData = (pharmacyStats as any[]).map((s) => ({
    name: s.name.toUpperCase(),
    value: s._count.pharmacies,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Statistiques</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pie pharmacies */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Pharmacies par grossiste</h3>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span style={{ background: COLORS[i % COLORS.length] }} className="w-3 h-3 rounded-full inline-block" />
                      <span className="text-gray-700 font-medium">{d.name}</span>
                    </div>
                    <span className="text-gray-500 font-semibold">{d.value.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <span className="text-gray-600 font-semibold">Total</span>
                  <span className="text-blue-600 font-bold">{pieData.reduce((a,d)=>a+d.value,0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">
              Importez d'abord les pharmacies Excel<br/>
              <code className="text-xs bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">npm run db:import</code>
            </p>
          )}
        </div>

        {/* KPIs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Vue d'ensemble</h3>
          <div className="space-y-3">
            {[
              { label: "Total délégués",      value: stats?.totalDelegates,  color: "text-blue-600"   },
              { label: "Actifs en ce moment", value: stats?.activeDelegates, color: "text-green-600"  },
              { label: "Rapports de visite",  value: stats?.totalReports,    color: "text-purple-600" },
              { label: "Pharmacies en base",  value: stats?.totalPharmacies, color: "text-orange-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-gray-50">
                <span className="text-gray-600 text-sm">{label}</span>
                <span className={`font-bold text-2xl ${color}`}>
                  {value?.toLocaleString() ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
