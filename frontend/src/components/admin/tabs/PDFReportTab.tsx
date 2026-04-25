import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Loader, Calendar, User, Filter, CheckCircle } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useLab }  from "../../../contexts/LabContext";

export default function PDFReportTab() {
  const { user }        = useAuth();
  const { selectedLab } = useLab();
  const now             = new Date();

  const [from,         setFrom]         = useState(() => { const d = new Date(now.getFullYear(), now.getMonth(), 1); return d.toISOString().split("T")[0]; });
  const [to,           setTo]           = useState(() => now.toISOString().split("T")[0]);
  const [delegateId,   setDelegateId]   = useState("");
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState("");

  const { data: delegates = [] } = useQuery({
    queryKey: ["delegates-pdf", selectedLab],
    queryFn:  () => api.get("/delegates", { headers: { "X-Lab": selectedLab || "all" } }).then(r => r.data),
    staleTime: 60000,
  });

  const { data: stats } = useQuery({
    queryKey: ["pdf-preview-stats", from, to, delegateId, selectedLab],
    queryFn:  () => api.get("/reports", {
      params:  { from, to, delegateId: delegateId || undefined, limit: 1 },
      headers: { "X-Lab": selectedLab || "all" },
    }).then(r => ({ total: r.data.total || 0 })),
    enabled: !!from && !!to,
  });

  const handleDownload = async () => {
    setLoading(true); setError(""); setSuccess(false);
    try {
      const params = new URLSearchParams({ from, to });
      if (delegateId) params.append("delegateId", delegateId);

      const response = await api.get(`/reports/export/pdf?${params}`, {
        responseType: "blob",
        headers: { "X-Lab": selectedLab || "all" },
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `rapport_inox_pharma_${from}_${to}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Erreur lors de la génération du PDF. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    { label: "Ce mois",        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],     to: now.toISOString().split("T")[0] },
    { label: "Mois dernier",   from: new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().split("T")[0],   to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0] },
    { label: "Ce trimestre",   from: new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1).toISOString().split("T")[0], to: now.toISOString().split("T")[0] },
    { label: "Cette année",    from: `${now.getFullYear()}-01-01`, to: now.toISOString().split("T")[0] },
  ];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }} className="space-y-5">
      <div className="flex items-center gap-3">
        <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#065f46,#059669)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FileDown size={22} color="white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Rapport PDF automatique</h2>
          <p className="text-sm text-gray-400">Génère un PDF complet avec statistiques et graphiques</p>
        </div>
      </div>

      {/* Périodes rapides */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Période rapide</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {presets.map(p => (
            <button key={p.label}
              onClick={() => { setFrom(p.from); setTo(p.to); }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                from === p.from && to === p.to
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><Filter size={13} /> Filtres</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Du</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Au</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block flex items-center gap-1"><User size={12} /> Délégué (optionnel)</label>
          <select value={delegateId} onChange={e => setDelegateId(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
            <option value="">Tous les délégués</option>
            {(delegates as any[]).map((d: any) => (
              <option key={d.id} value={d.id}>{d.user.firstName} {d.user.lastName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Aperçu */}
      {stats && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-4">
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileDown size={20} color="#059669" />
          </div>
          <div>
            <p className="font-bold text-emerald-800">{stats.total} rapport(s) trouvé(s)</p>
            <p className="text-xs text-emerald-600">du {new Date(from).toLocaleDateString("fr-FR")} au {new Date(to).toLocaleDateString("fr-FR")}</p>
          </div>
        </div>
      )}

      {error   && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">❌ {error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-700 text-sm flex items-center gap-2"><CheckCircle size={16} /> PDF téléchargé avec succès !</div>}

      <button onClick={handleDownload} disabled={loading || !from || !to}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm">
        {loading ? <><Loader size={16} className="animate-spin" /> Génération en cours…</> : <><FileDown size={16} /> Télécharger le PDF</>}
      </button>

      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">📋 Contenu du PDF</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Résumé statistique de la période</li>
          <li>• Détail des rapports hebdomadaires par délégué</li>
          <li>• Tableau d'activité (MG, Spécialistes, Officines…)</li>
          <li>• Réflexions pharmaceutiques et médicales</li>
          <li>• Activités de la concurrence</li>
        </ul>
      </div>
    </div>
  );
}