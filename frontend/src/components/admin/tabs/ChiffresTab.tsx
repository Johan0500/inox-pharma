import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Send, Download } from "lucide-react";
import api from "../../../services/api";

const GROSSISTES = ["copharmed", "laborex", "tedis", "dpci"] as const;
type Grossiste = typeof GROSSISTES[number];

const COL_LABELS = ["STOCK", "VENTE", "S", "V"] as const;

function calcS(stock: number, vente: number): number {
  if (stock === 0) return 0;
  return Math.round((vente / stock) * 100);
}

function calcV(vente: number, pght: number): number {
  return vente * pght;
}

export default function ChiffresTab() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const pendingRef = useRef<Record<string, NodeJS.Timeout>>({});

  const { data: report, isLoading } = useQuery({
    queryKey: ["sales-report-current"],
    queryFn:  () => api.get("/sales-reports/current").then((r) => r.data),
  });

  const updateLine = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/sales-reports/line/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-report-current"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const submitReport = useMutation({
    mutationFn: (id: string) => api.post(`/sales-reports/${id}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-report-current"] });
      alert("✅ Rapport soumis au Super Admin avec succès !");
    },
    onError: () => alert("❌ Erreur lors de la soumission"),
  });

  // Sauvegarder avec debounce
  const handleCellChange = (lineId: string, field: string, value: string) => {
    const numVal = parseFloat(value) || 0;

    // Annuler le timer précédent pour cette ligne
    if (pendingRef.current[lineId]) {
      clearTimeout(pendingRef.current[lineId]);
    }

    // Recalculer S et V automatiquement
    const line = report?.lines.find((l: any) => l.id === lineId);
    if (!line) return;

    const updated: any = { [field]: numVal };

    // Recalcul automatique de S et V pour chaque grossiste
    for (const g of GROSSISTES) {
      const stock = field === `${g}Stock` ? numVal : line[`${g}Stock`];
      const vente = field === `${g}Vente` ? numVal : line[`${g}Vente`];
      updated[`${g}S`] = calcS(stock, vente);
      updated[`${g}V`] = calcV(vente, line.pght);
    }

    setSaving(true);
    pendingRef.current[lineId] = setTimeout(() => {
      updateLine.mutate({ id: lineId, data: updated });
      setSaving(false);
    }, 800);
  };

  const totalVentes = report?.lines?.reduce((acc: number, l: any) =>
    acc + GROSSISTES.reduce((a, g) => a + (l[`${g}Vente`] || 0), 0), 0
  ) || 0;

  const totalCA = report?.lines?.reduce((acc: number, l: any) => {
    const ventes = GROSSISTES.reduce((a, g) => a + (l[`${g}Vente`] || 0), 0);
    return acc + ventes * l.pght;
  }, 0) || 0;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Chargement du tableau...
    </div>
  );

  const isSubmitted = report?.status === "SUBMITTED";

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tableau des Chiffres</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {report?.laboratory?.name?.toUpperCase()} — {report?.month}/{report?.year}
            {isSubmitted && (
              <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                ✓ Soumis
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {saving && <span className="text-xs text-gray-400 self-center">Sauvegarde...</span>}
          {saved  && <span className="text-xs text-green-600 self-center">✓ Sauvegardé</span>}
          {!isSubmitted && (
            <button
              onClick={() => {
                if (confirm("Soumettre ce rapport au Super Admin ? Vous ne pourrez plus le modifier.")) {
                  submitReport.mutate(report.id);
                }
              }}
              disabled={submitReport.isPending}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
            >
              <Send size={16} />
              {submitReport.isPending ? "Envoi..." : "Soumettre au Super Admin"}
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Total Ventes</p>
          <p className="text-2xl font-bold text-blue-600">{totalVentes.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">CA Total (FCFA)</p>
          <p className="text-2xl font-bold text-green-600">{totalCA.toLocaleString()}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-2 py-2 text-center border border-slate-700 w-8">It.</th>
                <th className="px-2 py-2 text-left border border-slate-700 min-w-[200px]">DÉSIGNATION</th>
                <th className="px-2 py-2 text-center border border-slate-700 w-16">PGHT</th>
                {GROSSISTES.map((g) => (
                  <th key={g} colSpan={4} className="px-2 py-2 text-center border border-slate-700">
                    {g.toUpperCase()}
                  </th>
                ))}
                <th className="px-2 py-2 text-center border border-slate-700" colSpan={2}>TOTAL</th>
              </tr>
              <tr className="bg-slate-700 text-slate-200">
                <th className="border border-slate-600 py-1"></th>
                <th className="border border-slate-600 py-1"></th>
                <th className="border border-slate-600 py-1"></th>
                {GROSSISTES.map((g) =>
                  COL_LABELS.map((col) => (
                    <th key={`${g}-${col}`} className="px-1 py-1 text-center border border-slate-600 w-14">
                      {col}
                    </th>
                  ))
                )}
                <th className="border border-slate-600 py-1 w-16 text-center">STOCKS</th>
                <th className="border border-slate-600 py-1 w-16 text-center">VENTES</th>
              </tr>
            </thead>
            <tbody>
              {report?.lines?.map((line: any, idx: number) => {
                const totalStock  = GROSSISTES.reduce((a, g) => a + (line[`${g}Stock`]  || 0), 0);
                const totalVente  = GROSSISTES.reduce((a, g) => a + (line[`${g}Vente`]  || 0), 0);
                const rowBg       = idx % 2 === 0 ? "bg-white" : "bg-gray-50";

                return (
                  <tr key={line.id} className={`${rowBg} hover:bg-blue-50 transition`}>
                    <td className="px-1 py-1 text-center border border-gray-200 text-gray-500">
                      {line.itemNumber}
                    </td>
                    <td className="px-2 py-1 border border-gray-200 font-medium text-gray-800 text-xs">
                      {line.designation}
                    </td>
                    <td className="px-1 py-1 text-center border border-gray-200 text-gray-600">
                      {line.pght.toLocaleString()}
                    </td>
                    {GROSSISTES.map((g) => (
                      <>
                        {/* STOCK */}
                        <td key={`${g}-stock`} className="border border-gray-200 p-0">
                          {isSubmitted ? (
                            <span className="block text-center px-1">{line[`${g}Stock`] || 0}</span>
                          ) : (
                            <input
                              type="number"
                              defaultValue={line[`${g}Stock`] || 0}
                              onChange={(e) => handleCellChange(line.id, `${g}Stock`, e.target.value)}
                              className="w-full text-center px-1 py-1 bg-blue-50 border-0 outline-none focus:bg-blue-100 text-blue-800 font-semibold"
                              min="0"
                            />
                          )}
                        </td>
                        {/* VENTE */}
                        <td key={`${g}-vente`} className="border border-gray-200 p-0">
                          {isSubmitted ? (
                            <span className="block text-center px-1">{line[`${g}Vente`] || 0}</span>
                          ) : (
                            <input
                              type="number"
                              defaultValue={line[`${g}Vente`] || 0}
                              onChange={(e) => handleCellChange(line.id, `${g}Vente`, e.target.value)}
                              className="w-full text-center px-1 py-1 bg-green-50 border-0 outline-none focus:bg-green-100 text-green-800 font-semibold"
                              min="0"
                            />
                          )}
                        </td>
                        {/* S — calculé auto */}
                        <td key={`${g}-s`} className="border border-gray-200 text-center text-gray-500 px-1">
                          {line[`${g}S`] || 0}%
                        </td>
                        {/* V — calculé auto */}
                        <td key={`${g}-v`} className="border border-gray-200 text-center text-gray-500 px-1">
                          {((line[`${g}V`] || 0)).toLocaleString()}
                        </td>
                      </>
                    ))}
                    <td className="px-1 py-1 text-center border border-gray-200 font-semibold text-gray-700">
                      {totalStock.toLocaleString()}
                    </td>
                    <td className="px-1 py-1 text-center border border-gray-200 font-bold text-blue-700">
                      {totalVente.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Ligne TOTAL */}
            <tfoot>
              <tr className="bg-slate-100 font-bold">
                <td colSpan={3} className="px-2 py-2 border border-gray-300 text-right text-gray-700">
                  TOTAL
                </td>
                {GROSSISTES.map((g) => {
                  const tStock = report?.lines?.reduce((a: number, l: any) => a + (l[`${g}Stock`] || 0), 0) || 0;
                  const tVente = report?.lines?.reduce((a: number, l: any) => a + (l[`${g}Vente`] || 0), 0) || 0;
                  const tS     = tStock > 0 ? Math.round((tVente / tStock) * 100) : 0;
                  const tV     = report?.lines?.reduce((a: number, l: any) => a + (l[`${g}V`] || 0), 0) || 0;
                  return (
                    <>
                      <td key={`tot-${g}-s`} className="px-1 py-2 text-center border border-gray-300 text-blue-700">{tStock.toLocaleString()}</td>
                      <td key={`tot-${g}-v`} className="px-1 py-2 text-center border border-gray-300 text-green-700">{tVente.toLocaleString()}</td>
                      <td key={`tot-${g}-sp`} className="px-1 py-2 text-center border border-gray-300 text-gray-600">{tS}%</td>
                      <td key={`tot-${g}-vp`} className="px-1 py-2 text-center border border-gray-300 text-gray-600">{tV.toLocaleString()}</td>
                    </>
                  );
                })}
                <td className="px-1 py-2 text-center border border-gray-300 text-gray-700">
                  {report?.lines?.reduce((a: number, l: any) =>
                    a + GROSSISTES.reduce((b, g) => b + (l[`${g}Stock`] || 0), 0), 0)?.toLocaleString()}
                </td>
                <td className="px-1 py-2 text-center border border-gray-300 text-blue-700">
                  {totalVentes.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Récapitulatif par grossiste */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-slate-800 px-5 py-3">
          <h3 className="font-bold text-white">Récapitulatif par grossiste</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-700 text-slate-200">
              <th className="px-4 py-2 text-left">Grossiste</th>
              <th className="px-4 py-2 text-right">Valeur Stock</th>
              <th className="px-4 py-2 text-right">CA Réalisé</th>
              <th className="px-4 py-2 text-right">Moy./jour</th>
            </tr>
          </thead>
          <tbody>
            {GROSSISTES.map((g, i) => {
              const valStock = report?.lines?.reduce((a: number, l: any) =>
                a + (l[`${g}Stock`] || 0) * l.pght, 0) || 0;
              const caReal   = report?.lines?.reduce((a: number, l: any) =>
                a + (l[`${g}Vente`] || 0) * l.pght, 0) || 0;
              const moy      = Math.round(caReal / 18);
              return (
                <tr key={g} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-2 font-semibold text-gray-800">{g.toUpperCase()}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{valStock.toLocaleString()} FCFA</td>
                  <td className="px-4 py-2 text-right text-blue-700 font-semibold">{caReal.toLocaleString()} FCFA</td>
                  <td className="px-4 py-2 text-right text-gray-500">{moy.toLocaleString()} FCFA</td>
                </tr>
              );
            })}
            <tr className="bg-blue-50 font-bold">
              <td className="px-4 py-2 text-gray-800">TOTAL</td>
              <td className="px-4 py-2 text-right text-gray-700">
                {GROSSISTES.reduce((a, g) =>
                  a + (report?.lines?.reduce((b: number, l: any) =>
                    b + (l[`${g}Stock`] || 0) * l.pght, 0) || 0), 0).toLocaleString()} FCFA
              </td>
              <td className="px-4 py-2 text-right text-blue-700">
                {totalCA.toLocaleString()} FCFA
              </td>
              <td className="px-4 py-2 text-right text-gray-600">
                {Math.round(totalCA / 18).toLocaleString()} FCFA
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}