import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, TrendingUp, TrendingDown, Minus, Plus, Trash2, Edit2, Check, X, RotateCcw } from "lucide-react";
import api from "../../../services/api";

const GROSSISTES = ["copharmed", "laborex", "tedis", "dpci"] as const;
type Grossiste   = typeof GROSSISTES[number];
const JOURS_PERIODE = 18;

function formatFCFA(n: number): string {
  return n.toLocaleString("fr-FR") + " F";
}

function calcS(stock: number, vente: number): number {
  if (stock === 0) return 0;
  return Math.round((vente / stock) * 100);
}

export default function ChiffresTab() {
  const queryClient = useQueryClient();
  const pendingRef  = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct,  setNewProduct]  = useState({ designation: "", pght: "" });
  const [editPght,    setEditPght]    = useState<Record<string, string>>({});
  const [editDesig,   setEditDesig]   = useState<Record<string, string>>({});

  const { data: report, isLoading } = useQuery({
    queryKey: ["sales-report-current"],
    queryFn:  () => api.get("/sales-reports/current").then((r) => r.data),
  });

  const { data: yesterday } = useQuery({
    queryKey: ["sales-report-yesterday"],
    queryFn:  () => api.get("/sales-reports/yesterday").then((r) => r.data).catch(() => null),
  });

  const updateLine = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/sales-reports/line/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-report-current"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const addLine = useMutation({
    mutationFn: ({ reportId, data }: { reportId: string; data: any }) =>
      api.post(`/sales-reports/${reportId}/line`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-report-current"] });
      setShowAddForm(false);
      setNewProduct({ designation: "", pght: "" });
    },
    onError: () => alert("❌ Erreur lors de l'ajout du produit"),
  });

  const deleteLine = useMutation({
    mutationFn: (id: string) => api.delete(`/sales-reports/line/${id}`),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["sales-report-current"] }),
  });

  const submitReport = useMutation({
    mutationFn: (id: string) => api.post(`/sales-reports/${id}/submit`),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ["sales-report-current"] });
      alert("✅ Rapport soumis au Super Admin !");
    },
  });

  const reopenReport = useMutation({
    mutationFn: (id: string) => api.post(`/sales-reports/${id}/reopen`),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["sales-report-current"] }),
  });

  // Modifier cellule stock/vente avec debounce
  const handleCellChange = useCallback((lineId: string, field: string, value: string) => {
    const numVal = parseFloat(value) || 0;
    if (pendingRef.current[lineId]) clearTimeout(pendingRef.current[lineId]);

    const line = report?.lines?.find((l: any) => l.id === lineId);
    if (!line) return;

    const updated: any = { [field]: numVal };
    for (const g of GROSSISTES) {
      const stock = field === `${g}Stock` ? numVal : (line[`${g}Stock`] || 0);
      const vente = field === `${g}Vente` ? numVal : (line[`${g}Vente`] || 0);
      const pght  = field === "pght" ? numVal : line.pght;
      updated[`${g}S`] = calcS(stock, vente);
      updated[`${g}V`] = vente * pght;
    }

    setSaving(true);
    pendingRef.current[lineId] = setTimeout(() => {
      updateLine.mutate({ id: lineId, data: updated });
      setSaving(false);
    }, 800);
  }, [report, updateLine]);

  // Sauvegarder PGHT
  const savePght = (lineId: string) => {
    const val = parseFloat(editPght[lineId]);
    if (isNaN(val) || val <= 0) return;
    handleCellChange(lineId, "pght", String(val));
    setEditPght((prev) => { const n = {...prev}; delete n[lineId]; return n; });
  };

  // Sauvegarder désignation
  const saveDesig = (lineId: string) => {
    const val = editDesig[lineId]?.trim();
    if (!val) return;
    updateLine.mutate({ id: lineId, data: { designation: val } });
    setEditDesig((prev) => { const n = {...prev}; delete n[lineId]; return n; });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Chargement du tableau...
    </div>
  );

  const isSubmitted = report?.status === "SUBMITTED";

  // ── Calculs récapitulatifs ────────────────────────────────
  const stats = GROSSISTES.map((g) => {
    const valStock  = report?.lines?.reduce((a: number, l: any) =>
      a + (l[`${g}Stock`] || 0) * l.pght, 0) || 0;
    const caRealise = report?.lines?.reduce((a: number, l: any) =>
      a + (l[`${g}Vente`] || 0) * l.pght, 0) || 0;
    const moyJour   = Math.round(caRealise / JOURS_PERIODE);
    const caYest    = yesterday?.lines?.reduce((a: number, l: any) =>
      a + (l[`${g}Vente`] || 0) * l.pght, 0) || 0;
    const evolution = caYest > 0
      ? Math.round(((caRealise - caYest) / caYest) * 100)
      : null;
    return { grossiste: g, valStock, caRealise, moyJour, caYest, evolution };
  });

  const totalValStock  = stats.reduce((a, s) => a + s.valStock,  0);
  const totalCA        = stats.reduce((a, s) => a + s.caRealise, 0);
  const totalMoy       = stats.reduce((a, s) => a + s.moyJour,   0);
  const totalYest      = stats.reduce((a, s) => a + s.caYest,    0);
  const totalEvol      = totalYest > 0
    ? Math.round(((totalCA - totalYest) / totalYest) * 100)
    : null;
  const totalVentes    = report?.lines?.reduce((acc: number, l: any) =>
    acc + GROSSISTES.reduce((a, g) => a + (l[`${g}Vente`] || 0), 0), 0) || 0;

  const EvolBadge = ({ v }: { v: number | null }) => {
    if (v === null) return <span className="text-gray-400 text-xs">—</span>;
    if (v > 0) return <span className="flex items-center gap-1 text-green-600 font-semibold"><TrendingUp size={13}/>+{v}%</span>;
    if (v < 0) return <span className="flex items-center gap-1 text-red-600 font-semibold"><TrendingDown size={13}/>{v}%</span>;
    return <span className="flex items-center gap-1 text-gray-500"><Minus size={13}/>0%</span>;
  };

  return (
    <div className="space-y-5">

      {/* ── En-tête ──────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tableau des Chiffres</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {report?.laboratory?.name?.toUpperCase()} — {report?.month}/{report?.year}
            {isSubmitted
              ? <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">✓ Soumis</span>
              : <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-semibold">Brouillon</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saving && <span className="text-xs text-gray-400">Sauvegarde...</span>}
          {saved  && <span className="text-xs text-green-600">✓ Sauvegardé</span>}

          {isSubmitted ? (
            <button
              onClick={() => { if(confirm("Réouvrir pour modifications ?")) reopenReport.mutate(report.id); }}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium transition"
            >
              <RotateCcw size={16} />
              Modifier le rapport
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition"
              >
                <Plus size={16} />
                Ajouter un produit
              </button>
              <button
                onClick={() => { if(confirm("Soumettre ce rapport au Super Admin ?")) submitReport.mutate(report.id); }}
                disabled={submitReport.isPending}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-medium transition disabled:opacity-60"
              >
                <Send size={16} />
                {submitReport.isPending ? "Envoi..." : "Soumettre"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Formulaire ajout produit ─────────────────────── */}
      {showAddForm && !isSubmitted && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Nouveau produit</h3>
          <div className="flex gap-3 flex-wrap">
            <input
              value={newProduct.designation}
              onChange={(e) => setNewProduct((p) => ({ ...p, designation: e.target.value }))}
              className="flex-1 min-w-64 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Désignation du produit..."
            />
            <input
              type="number"
              value={newProduct.pght}
              onChange={(e) => setNewProduct((p) => ({ ...p, pght: e.target.value }))}
              className="w-36 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="PGHT (prix)"
              min="0"
            />
            <button
              onClick={() => {
                if (!newProduct.designation || !newProduct.pght)
                  return alert("Remplissez la désignation et le PGHT");
                addLine.mutate({ reportId: report.id, data: newProduct });
              }}
              disabled={addLine.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition disabled:opacity-60"
            >
              {addLine.isPending ? "Ajout..." : "Ajouter"}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── RÉCAPITULATIF PAR GROSSISTE ───────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-slate-800 px-5 py-3">
          <h3 className="font-bold text-white">Récapitulatif par grossiste</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700 text-slate-200 text-xs">
                <th className="px-4 py-3 text-left">Grossiste</th>
                <th className="px-4 py-3 text-right">Valeur du stock</th>
                <th className="px-4 py-3 text-right">CA réalisé</th>
                <th className="px-4 py-3 text-right">Moy. / jour</th>
                <th className="px-4 py-3 text-right">CA hier (J-1)</th>
                <th className="px-4 py-3 text-right">Évolution</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.grossiste} className={`border-t ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition`}>
                  <td className="px-4 py-3 font-bold text-gray-800 uppercase">{s.grossiste}</td>
                  <td className="px-4 py-3 text-right text-gray-700 font-medium">{formatFCFA(s.valStock)}</td>
                  <td className="px-4 py-3 text-right text-blue-700 font-bold">{formatFCFA(s.caRealise)}</td>
                  <td className="px-4 py-3 text-right text-purple-700 font-medium">{formatFCFA(s.moyJour)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatFCFA(s.caYest)}</td>
                  <td className="px-4 py-3 text-right"><EvolBadge v={s.evolution} /></td>
                </tr>
              ))}
              <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold">
                <td className="px-4 py-3 text-gray-800">TOTAL</td>
                <td className="px-4 py-3 text-right text-gray-800">{formatFCFA(totalValStock)}</td>
                <td className="px-4 py-3 text-right text-blue-800">{formatFCFA(totalCA)}</td>
                <td className="px-4 py-3 text-right text-purple-800">{formatFCFA(totalMoy)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{formatFCFA(totalYest)}</td>
                <td className="px-4 py-3 text-right"><EvolBadge v={totalEvol} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── KPI CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Valeur totale stock",  value: formatFCFA(totalValStock), color: "text-gray-800"   },
          { label: "CA total réalisé",     value: formatFCFA(totalCA),       color: "text-blue-700"   },
          { label: "Moyenne / jour",       value: formatFCFA(totalMoy),      color: "text-purple-700" },
          { label: "Évolution vs hier",    value: totalEvol === null ? "—" : totalEvol > 0 ? `+${totalEvol}%` : `${totalEvol}%`,
            color: totalEvol === null ? "text-gray-400" : totalEvol > 0 ? "text-green-600" : totalEvol < 0 ? "text-red-600" : "text-gray-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── TABLEAU DÉTAILLÉ PRODUITS ─────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-slate-800 px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold text-white">Tableau détaillé par produit</h3>
          <span className="text-slate-400 text-xs">
            Cliquez sur le crayon ✏️ pour modifier la désignation ou le PGHT
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-700 text-slate-200">
                <th className="px-2 py-2 text-center border border-slate-600 w-8">It.</th>
                <th className="px-2 py-2 text-left border border-slate-600 min-w-[180px]">DÉSIGNATION</th>
                <th className="px-2 py-2 text-center border border-slate-600 w-20">PGHT</th>
                {GROSSISTES.map((g) => (
                  <th key={g} colSpan={4} className="px-2 py-2 text-center border border-slate-600">
                    {g.toUpperCase()}
                  </th>
                ))}
                <th className="px-2 py-2 text-center border border-slate-600 w-14">TOT.STK</th>
                <th className="px-2 py-2 text-center border border-slate-600 w-14">TOT.VTE</th>
                <th className="px-2 py-2 text-center border border-slate-600 w-20">CA</th>
                <th className="px-2 py-2 text-center border border-slate-600 w-10"></th>
              </tr>
              <tr className="bg-slate-600 text-slate-300 text-xs">
                <th className="border border-slate-500"></th>
                <th className="border border-slate-500"></th>
                <th className="border border-slate-500"></th>
                {GROSSISTES.map((g) => (
                  <>
                    <th key={`${g}-s`}  className="px-1 py-1 border border-slate-500 w-12 text-blue-300">STK</th>
                    <th key={`${g}-v`}  className="px-1 py-1 border border-slate-500 w-12 text-green-300">VTE</th>
                    <th key={`${g}-sp`} className="px-1 py-1 border border-slate-500 w-10">S%</th>
                    <th key={`${g}-vp`} className="px-1 py-1 border border-slate-500 w-14">Val.</th>
                  </>
                ))}
                <th className="border border-slate-500"></th>
                <th className="border border-slate-500"></th>
                <th className="border border-slate-500"></th>
                <th className="border border-slate-500"></th>
              </tr>
            </thead>
            <tbody>
              {report?.lines?.map((line: any, idx: number) => {
                const totalStock = GROSSISTES.reduce((a, g) => a + (line[`${g}Stock`] || 0), 0);
                const totalVente = GROSSISTES.reduce((a, g) => a + (line[`${g}Vente`] || 0), 0);
                const caLigne    = totalVente * line.pght;
                const rowBg      = idx % 2 === 0 ? "bg-white" : "bg-gray-50";
                const isPghtEdit = editPght[line.id] !== undefined;
                const isDesigEdit = editDesig[line.id] !== undefined;

                return (
                  <tr key={line.id} className={`${rowBg} hover:bg-blue-50 transition`}>
                    <td className="px-1 py-1 text-center border border-gray-200 text-gray-400">{line.itemNumber}</td>

                    {/* DÉSIGNATION éditable */}
                    <td className="border border-gray-200 p-0">
                      {isDesigEdit ? (
                        <div className="flex items-center gap-1 px-1">
                          <input
                            value={editDesig[line.id]}
                            onChange={(e) => setEditDesig((p) => ({ ...p, [line.id]: e.target.value }))}
                            className="flex-1 border rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                            autoFocus
                          />
                          <button onClick={() => saveDesig(line.id)} className="text-green-600 hover:text-green-700"><Check size={12}/></button>
                          <button onClick={() => setEditDesig((p) => { const n={...p}; delete n[line.id]; return n; })} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-2 py-1 gap-1">
                          <span className="font-medium text-gray-800">{line.designation}</span>
                          <button
                            onClick={() => setEditDesig((p) => ({ ...p, [line.id]: line.designation }))}
                            className="text-gray-300 hover:text-blue-500 flex-shrink-0"
                          >
                            <Edit2 size={11}/>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* PGHT éditable */}
                    <td className="border border-gray-200 p-0">
                      {isPghtEdit ? (
                        <div className="flex items-center gap-1 px-1">
                          <input
                            type="number"
                            value={editPght[line.id]}
                            onChange={(e) => setEditPght((p) => ({ ...p, [line.id]: e.target.value }))}
                            className="w-16 border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-center"
                            autoFocus
                            min="0"
                          />
                          <button onClick={() => savePght(line.id)} className="text-green-600 hover:text-green-700"><Check size={12}/></button>
                          <button onClick={() => setEditPght((p) => { const n={...p}; delete n[line.id]; return n; })} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-2 py-1 gap-1">
                          <span className="text-gray-600 font-medium">{line.pght.toLocaleString()}</span>
                          <button
                            onClick={() => setEditPght((p) => ({ ...p, [line.id]: String(line.pght) }))}
                            className="text-gray-300 hover:text-blue-500 flex-shrink-0"
                          >
                            <Edit2 size={11}/>
                          </button>
                        </div>
                      )}
                    </td>

                    {GROSSISTES.map((g) => (
                      <>
                        <td key={`${g}-stk`} className="border border-gray-200 p-0 w-12">
                          <input
                            type="number"
                            defaultValue={line[`${g}Stock`] || 0}
                            onChange={(e) => handleCellChange(line.id, `${g}Stock`, e.target.value)}
                            className="w-full text-center px-1 py-1 bg-blue-50 border-0 outline-none focus:bg-blue-100 text-blue-800 font-semibold"
                            min="0"
                          />
                        </td>
                        <td key={`${g}-vte`} className="border border-gray-200 p-0 w-12">
                          <input
                            type="number"
                            defaultValue={line[`${g}Vente`] || 0}
                            onChange={(e) => handleCellChange(line.id, `${g}Vente`, e.target.value)}
                            className="w-full text-center px-1 py-1 bg-green-50 border-0 outline-none focus:bg-green-100 text-green-800 font-semibold"
                            min="0"
                          />
                        </td>
                        <td key={`${g}-sp`} className="border border-gray-200 text-center text-gray-500 px-1">
                          {line[`${g}S`] || 0}%
                        </td>
                        <td key={`${g}-vp`} className="border border-gray-200 text-center text-gray-500 px-1">
                          {(line[`${g}V`] || 0).toLocaleString()}
                        </td>
                      </>
                    ))}

                    <td className="px-1 py-1 text-center border border-gray-200 font-semibold text-gray-700">{totalStock.toLocaleString()}</td>
                    <td className="px-1 py-1 text-center border border-gray-200 font-bold text-blue-700">{totalVente.toLocaleString()}</td>
                    <td className="px-1 py-1 text-center border border-gray-200 font-bold text-green-700">{caLigne.toLocaleString()}</td>

                    {/* Supprimer ligne */}
                    <td className="px-1 py-1 text-center border border-gray-200">
                      <button
                        onClick={() => { if(confirm(`Supprimer "${line.designation}" ?`)) deleteLine.mutate(line.id); }}
                        className="text-red-300 hover:text-red-600 transition"
                        title="Supprimer ce produit"
                      >
                        <Trash2 size={13}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* TOTAL */}
            <tfoot>
              <tr className="bg-slate-100 font-bold text-xs">
                <td colSpan={3} className="px-2 py-2 border border-gray-300 text-right text-gray-700">TOTAL</td>
                {GROSSISTES.map((g) => {
                  const tS  = report?.lines?.reduce((a: number, l: any) => a + (l[`${g}Stock`] || 0), 0) || 0;
                  const tV  = report?.lines?.reduce((a: number, l: any) => a + (l[`${g}Vente`] || 0), 0) || 0;
                  const tSp = tS > 0 ? Math.round((tV / tS) * 100) : 0;
                  const tVp = report?.lines?.reduce((a: number, l: any) => a + (l[`${g}V`]     || 0), 0) || 0;
                  return (
                    <>
                      <td key={`t-${g}-s`}  className="px-1 py-2 text-center border border-gray-300 text-blue-700">{tS.toLocaleString()}</td>
                      <td key={`t-${g}-v`}  className="px-1 py-2 text-center border border-gray-300 text-green-700">{tV.toLocaleString()}</td>
                      <td key={`t-${g}-sp`} className="px-1 py-2 text-center border border-gray-300 text-gray-600">{tSp}%</td>
                      <td key={`t-${g}-vp`} className="px-1 py-2 text-center border border-gray-300 text-gray-600">{tVp.toLocaleString()}</td>
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
                <td className="px-1 py-2 text-center border border-gray-300 text-green-700">
                  {formatFCFA(totalCA)}
                </td>
                <td className="border border-gray-300"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}