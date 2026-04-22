import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import api from "../../../services/api";
import { useLab } from "../../../contexts/LabContext";

const COLORS = ["#0066CC", "#00A86B", "#F59E0B", "#E74C3C", "#8B5CF6"];

const GROSSISTES = ["copharmed", "laborex", "tedis", "dpci"];

function fmt(value: number | undefined): string {
  return (value ?? 0).toLocaleString();
}

export default function StatsChiffresTab() {
  const now  = new Date();
  const { selectedLab } = useLab();
  const [month, setMonth] = useState(`${now.getMonth() + 1}`.padStart(2, "0"));
  const [year,  setYear]  = useState(now.getFullYear());

  const { data: allStats = [], isLoading } = useQuery({
    queryKey: ["sales-stats", month, year],
    queryFn:  () => api.get("/sales-reports/stats", { params: { month, year } }).then((r) => r.data),
  });

  // Filtrer STRICTEMENT par labo sélectionné — jamais de mélange entre labos
  const stats = selectedLab && selectedLab !== "all"
    ? (allStats as any[]).filter((s: any) =>
        s.laboratory?.toLowerCase() === selectedLab.toLowerCase()
      )
    : (allStats as any[]); // vue globale = tous les labos

  const chartData = (stats as any[]).map((s) => ({
    name:   s.laboratory,
    ventes: s.totalVentes  ?? 0,
    ca:     s.totalCA      ?? 0,  // ✅ corrigé : totalCA (pas caTotal)
    stocks: s.totalStocks  ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* En-tête + filtres */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Statistiques Chiffres</h2>
          {selectedLab && selectedLab !== "all" && (
            <p className="text-sm text-gray-500 mt-0.5">
              Laboratoire : <span className="font-semibold text-gray-700">{selectedLab.toUpperCase()}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={`${i + 1}`.padStart(2, "0")}>
                {new Date(2024, i).toLocaleString("fr-FR", { month: "long" })}
              </option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
            className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : (stats as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
          Aucun rapport soumis pour cette période
        </div>
      ) : (
        <>
          {/* Graphique CA par labo */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-4">CA par laboratoire (FCFA)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmt(v) + " FCFA"} />
                <Bar dataKey="ca" radius={[4, 4, 0, 0]} name="CA">
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cartes par labo */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(stats as any[]).map((s, i) => (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 text-white" style={{ background: COLORS[i % COLORS.length] }}>
                  <h3 className="font-bold">{s.laboratory.toUpperCase()}</h3>
                  <p className="text-xs opacity-80">
                    Soumis par {s.admin} — {s.month}/{s.year}
                  </p>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Ventes</span>
                    <span className="font-semibold text-gray-800">{fmt(s.totalVentes)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Stocks</span>
                    <span className="font-semibold text-gray-800">{fmt(s.totalStocks)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-600 font-medium">CA Total</span>
                    {/* ✅ corrigé : s.totalCA (pas s.caTotal) */}
                    <span className="font-bold text-blue-700">{fmt(s.totalCA)} FCFA</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tableau détaillé */}
          {(stats as any[]).map((s) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-slate-800 px-5 py-3">
                <h3 className="font-bold text-white">{s.laboratory.toUpperCase()} — Détail produits</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-700 text-slate-200">
                      <th className="px-3 py-2 text-left">Produit</th>
                      <th className="px-3 py-2 text-right">Total Stock</th>
                      <th className="px-3 py-2 text-right">Total Ventes</th>
                      <th className="px-3 py-2 text-right">CA (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.lines.map((l: any, i: number) => {
                      const tStock = GROSSISTES.reduce((a, g) => a + (l[`${g}Stock`] || 0), 0);
                      const tVente = GROSSISTES.reduce((a, g) => a + (l[`${g}Vente`] || 0), 0);
                      const ca     = tVente * (l.pght || 0);
                      return (
                        <tr key={l.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-1.5 text-gray-800">{l.designation}</td>
                          <td className="px-3 py-1.5 text-right text-gray-600">{fmt(tStock)}</td>
                          <td className="px-3 py-1.5 text-right text-blue-700 font-semibold">{fmt(tVente)}</td>
                          <td className="px-3 py-1.5 text-right text-green-700 font-semibold">{fmt(ca)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}