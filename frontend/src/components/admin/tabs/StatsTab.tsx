import { useQuery }          from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         PieChart, Pie, Cell }  from "recharts";
import api from "../../../services/api";

const COLORS = ["#0066CC","#00A86B","#F59E0B","#E74C3C","#8B5CF6","#06B6D4"];

export default function StatsTab() {
  const { data: stats, isError: statsError } = useQuery({
    queryKey: ["stats-dashboard"],
    queryFn:  () => api.get("/stats").then((r) => r.data),
    retry: 1,
  });

  const { data: pharmacyStatsRaw, isError: pharmError } = useQuery({
    queryKey: ["pharmacy-stats"],
    queryFn:  () => api.get("/pharmacies/stats").then((r) => r.data),
    retry: 1,
  });

  // Sécuriser les données — évite le crash si la structure est inattendue
  const byGrossiste: any[] = Array.isArray(pharmacyStatsRaw?.byGrossiste)
    ? pharmacyStatsRaw.byGrossiste
    : [];

  const pieData = byGrossiste
    .filter((s) => s && s.grossiste && s.count > 0)
    .map((s) => ({
      name:  String(s.grossiste).toUpperCase(),
      value: Number(s.count) || 0,
    }));

  const totalPharmacies = pieData.reduce((a, d) => a + d.value, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Statistiques</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── KPIs ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Vue d'ensemble</h3>
          {statsError ? (
            <p className="text-red-400 text-sm py-4 text-center">Erreur de chargement</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Total délégués",      value: stats?.totalDelegates,  color: "text-blue-600"   },
                { label: "Actifs en ce moment", value: stats?.activeDelegates, color: "text-green-600"  },
                { label: "Rapports de visite",  value: stats?.totalReports,    color: "text-purple-600" },
                { label: "Pharmacies en base",  value: stats?.totalPharmacies ?? pharmacyStatsRaw?.total, color: "text-orange-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600 text-sm">{label}</span>
                  <span className={`font-bold text-2xl ${color}`}>
                    {value != null ? Number(value).toLocaleString() : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Pie pharmacies par grossiste ─────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Pharmacies par grossiste</h3>
          {pharmError ? (
            <p className="text-red-400 text-sm py-4 text-center">Erreur de chargement</p>
          ) : pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={75}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [Number(v).toLocaleString(), "Pharmacies"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-gray-700 font-medium truncate">{d.name}</span>
                    </div>
                    <span className="text-gray-500 font-semibold flex-shrink-0">
                      {d.value.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm border-t pt-2 mt-2">
                  <span className="text-gray-600 font-semibold">Total</span>
                  <span className="text-blue-600 font-bold">{totalPharmacies.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">Aucune donnée disponible</p>
          )}
        </div>

        {/* ── Zones les plus actives ────────────────────────── */}
        {Array.isArray(pharmacyStatsRaw?.byZone) && pharmacyStatsRaw.byZone.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
            <h3 className="font-semibold text-gray-700 mb-4">
              Top zones (pharmacies)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={pharmacyStatsRaw.byZone.slice(0, 10).map((z: any) => ({
                  zone:  String(z.zone || "—").slice(0, 12),
                  count: Number(z.count) || 0,
                }))}
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <XAxis dataKey="zone" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [Number(v).toLocaleString(), "Pharmacies"]} />
                <Bar dataKey="count" fill="#0066CC" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  );
}
