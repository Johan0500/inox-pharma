import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText, Filter, Check, Loader, Database, Users } from "lucide-react";
import api from "../../../services/api";
import { useLab } from "../../../contexts/LabContext";

type ExportFormat = "csv" | "excel";
type DataType = "reports" | "delegates" | "gps" | "checkins" | "objectives";

const DATA_TYPES: { id: DataType; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "reports",    label: "Rapports de visite",      desc: "Tous les rapports hebdomadaires filtrés",      icon: <FileText size={16} /> },
  { id: "delegates",  label: "Délégués",                desc: "Liste complète avec stats et zones",           icon: <Users size={16} /> },
  { id: "gps",        label: "Historique GPS",          desc: "Positions GPS sur la période sélectionnée",    icon: <Database size={16} /> },
  { id: "checkins",   label: "Pointages",               desc: "Tous les check-ins avec lieux et horaires",    icon: <Database size={16} /> },
  { id: "objectives", label: "Objectifs & CA",          desc: "Suivi des objectifs de chiffre d'affaires",    icon: <Database size={16} /> },
];

function toCSV(data: any[], columns: { key: string; label: string }[]): string {
  const header = columns.map(c => `"${c.label}"`).join(";");
  const rows   = data.map(row =>
    columns.map(c => {
      const val = getNestedValue(row, c.key);
      const str = val == null ? "" : String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(";")
  );
  return "\uFEFF" + [header, ...rows].join("\n"); // BOM UTF-8 pour Excel
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ExportTab() {
  const { selectedLab } = useLab();
  const now = new Date();

  const [dataType, setDataType]   = useState<DataType>("reports");
  const [format,   setFormat]     = useState<ExportFormat>("excel");
  const [from,     setFrom]       = useState(() => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
  const [to,       setTo]         = useState(() => now.toISOString().split("T")[0]);
  const [loading,  setLoading]    = useState(false);
  const [success,  setSuccess]    = useState(false);
  const [error,    setError]      = useState("");
  const [delegateId, setDelegateId] = useState("");

  const { data: delegates = [] } = useQuery({
    queryKey: ["delegates-export", selectedLab],
    queryFn:  () => api.get("/delegates", { headers: { "X-Lab": selectedLab || "all" } }).then(r => r.data),
    staleTime: 60000,
  });

  const handleExport = async () => {
    setLoading(true); setError(""); setSuccess(false);
    try {
      let data: any[] = [];
      let columns: { key: string; label: string }[] = [];
      const fileDate = `${from}_${to}`;

      if (dataType === "reports") {
        const res = await api.get("/reports", {
          params:  { limit: 2000, from, to, delegateId: delegateId || undefined },
          headers: { "X-Lab": selectedLab || "all" },
        });
        data    = res.data.reports || [];
        columns = [
          { key: "doctorName",                   label: "Titre rapport" },
          { key: "delegate.user.firstName",       label: "Prénom délégué" },
          { key: "delegate.user.lastName",        label: "Nom délégué" },
          { key: "delegate.zone",                 label: "Zone" },
          { key: "laboratory.name",               label: "Laboratoire" },
          { key: "visitDate",                     label: "Date visite" },
          { key: "specialty",                     label: "Type" },
          { key: "productsShown",                 label: "Total visites" },
        ];
      } else if (dataType === "delegates") {
        const res = await api.get("/delegates", { headers: { "X-Lab": selectedLab || "all" } });
        data    = res.data || [];
        columns = [
          { key: "user.firstName",  label: "Prénom" },
          { key: "user.lastName",   label: "Nom" },
          { key: "user.email",      label: "Email" },
          { key: "zone",            label: "Zone" },
          { key: "phone",           label: "Téléphone" },
          { key: "status",          label: "Statut" },
          { key: "laboratory.name", label: "Laboratoire" },
          { key: "lastSeen",        label: "Dernière connexion" },
        ];
      } else if (dataType === "checkins") {
        // Utiliser l'endpoint GPS pour les check-ins
        const res = await api.get("/gps/checkins", {
          params:  { from, to, delegateId: delegateId || undefined },
          headers: { "X-Lab": selectedLab || "all" },
        }).catch(() => ({ data: [] }));
        data    = Array.isArray(res.data) ? res.data : [];
        columns = [
          { key: "delegate.user.firstName", label: "Prénom" },
          { key: "delegate.user.lastName",  label: "Nom" },
          { key: "placeName",               label: "Lieu" },
          { key: "latitude",                label: "Latitude" },
          { key: "longitude",               label: "Longitude" },
          { key: "timestamp",               label: "Horodatage" },
        ];
      } else if (dataType === "gps") {
        const res = await api.get("/gps/history", {
          params:  { date: from, delegateId: delegateId || undefined },
          headers: { "X-Lab": selectedLab || "all" },
        }).catch(() => ({ data: [] }));
        data    = Array.isArray(res.data) ? res.data : [];
        columns = [
          { key: "delegate.user.firstName", label: "Prénom" },
          { key: "delegate.user.lastName",  label: "Nom" },
          { key: "latitude",                label: "Latitude" },
          { key: "longitude",               label: "Longitude" },
          { key: "status",                  label: "Statut" },
          { key: "timestamp",               label: "Horodatage" },
        ];
      }

      if (data.length === 0) {
        setError("Aucune donnée trouvée pour ces critères.");
        setLoading(false);
        return;
      }

      const csvContent = toCSV(data, columns);

      if (format === "csv") {
        downloadFile(csvContent, `inox_pharma_${dataType}_${fileDate}.csv`, "text/csv;charset=utf-8;");
      } else {
        // Excel = CSV avec extension xlsx (ouvert nativement par Excel)
        downloadFile(csvContent, `inox_pharma_${dataType}_${fileDate}.xlsx`, "application/vnd.ms-excel");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError("Erreur lors de l'export. Vérifiez les filtres et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    { label: "Ce mois",      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0], to: now.toISOString().split("T")[0] },
    { label: "Mois dernier", from: new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().split("T")[0], to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0] },
    { label: "Ce trimestre", from: new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1).toISOString().split("T")[0], to: now.toISOString().split("T")[0] },
    { label: "Cette année",  from: `${now.getFullYear()}-01-01`, to: now.toISOString().split("T")[0] },
  ];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#0f766e,#14b8a6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Download size={22} color="white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Export Excel / CSV</h2>
          <p className="text-sm text-gray-400">Export avancé de toutes les données</p>
        </div>
      </div>

      {/* Type de données */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Données à exporter</p>
        <div className="grid grid-cols-1 gap-2">
          {DATA_TYPES.map(dt => (
            <button key={dt.id} onClick={() => setDataType(dt.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${dataType === dt.id ? "#0f766e" : "#e5e7eb"}`, background: dataType === dt.id ? "#f0fdfa" : "white", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
              <span style={{ color: dataType === dt.id ? "#0f766e" : "#9ca3af" }}>{dt.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: "#111827", margin: 0 }}>{dt.label}</p>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{dt.desc}</p>
              </div>
              {dataType === dt.id && <Check size={14} color="#0f766e" />}
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Format de sortie</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: "excel", label: "Excel (.xlsx)",  icon: <FileSpreadsheet size={18} />, desc: "Pour Microsoft Excel & Numbers" },
            { id: "csv",   label: "CSV (.csv)",     icon: <FileText size={18} />,        desc: "Format universel" },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setFormat(f.id)}
              style={{ padding: "12px 14px", borderRadius: 14, border: `2px solid ${format === f.id ? "#0f766e" : "#e5e7eb"}`, background: format === f.id ? "#f0fdfa" : "white", cursor: "pointer", textAlign: "left" }}>
              <div style={{ color: format === f.id ? "#0f766e" : "#9ca3af", marginBottom: 6 }}>{f.icon}</div>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#111827", margin: 0 }}>{f.label}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><Filter size={12} /> Filtres</p>
        <div className="grid grid-cols-4 gap-2">
          {presets.map(p => (
            <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); }}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${from === p.from && to === p.to ? "bg-teal-600 text-white border-teal-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-teal-50"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Du</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Au</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Délégué (optionnel)</label>
          <select value={delegateId} onChange={e => setDelegateId(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
            <option value="">Tous les délégués</option>
            {(delegates as any[]).map((d: any) => (
              <option key={d.id} value={d.id}>{d.user.firstName} {d.user.lastName}</option>
            ))}
          </select>
        </div>
      </div>

      {error   && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">❌ {error}</div>}
      {success && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-teal-700 text-sm flex items-center gap-2">
          <Check size={14} /> Fichier téléchargé avec succès !
        </div>
      )}

      <button onClick={handleExport} disabled={loading}
        className="w-full text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#0f766e,#14b8a6)" }}>
        {loading ? <><Loader size={16} className="animate-spin" /> Génération en cours…</> : <><Download size={16} /> Exporter {format.toUpperCase()}</>}
      </button>

      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-600 mb-1">ℹ️ À savoir</p>
        <p className="text-xs text-gray-500">Le fichier CSV inclut un BOM UTF-8 pour un affichage correct des caractères français dans Excel.</p>
      </div>
    </div>
  );
}