import { useState }       from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Check }    from "lucide-react";
import api                from "../../services/api";
import { useAuth }        from "../../contexts/AuthContext";
import { isOnline, saveReportOffline } from "../../services/offlineSync";

// ── Types ─────────────────────────────────────────────────────
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;
type Jour = typeof JOURS[number];

interface DayRow {
  MG: number; SPECIALS: number; INTERNES: number;
  INFIRMIERS: number; SAGE_F: number; PIQUTERIES: number; OFFICINES: number;
}

const EMPTY_DAY = (): DayRow => ({
  MG: 0, SPECIALS: 0, INTERNES: 0,
  INFIRMIERS: 0, SAGE_F: 0, PIQUTERIES: 0, OFFICINES: 0,
});

type TableData = Record<Jour, DayRow>;

const EMPTY_TABLE = (): TableData => {
  const t: any = {};
  JOURS.forEach(j => { t[j] = EMPTY_DAY(); });
  return t as TableData;
};

const COLS_MED  = ["MG", "SPECIALS", "INTERNES"] as const;
const COLS_PARA = ["INFIRMIERS", "SAGE_F", "PIQUTERIES", "OFFICINES"] as const;
const COL_LABELS: Record<string, string> = {
  MG: "MG", SPECIALS: "SPEC.", INTERNES: "INT.",
  INFIRMIERS: "INF.", SAGE_F: "S.F.", PIQUTERIES: "PIQ.", OFFICINES: "OFF.",
};

function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number" min={0} max={99}
      value={value === 0 ? "" : value}
      onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
      className="w-full text-center text-sm border-0 outline-none bg-transparent py-1.5 font-semibold"
      style={{ minWidth: 36 }}
    />
  );
}

export default function VisitReport({ onBack }: { onBack?: () => void }) {
  const { user } = useAuth();
  const qc       = useQueryClient();

  const [semaineDu,     setSemaineDu]     = useState("");
  const [semaineAu,     setSemaineAu]     = useState("");
  const [mois,          setMois]          = useState("");
  const [secteur,       setSecteur]       = useState((user as any)?.delegate?.sector?.zoneResidence || "");
  const [tableData,     setTableData]     = useState<TableData>(EMPTY_TABLE());
  const [reflexPharm,   setReflexPharm]   = useState("");
  const [reflexMedical, setReflexMedical] = useState("");
  const [activConc,     setActivConc]     = useState("");
  const [propositions,  setPropositions]  = useState("");
  const [rahSuccess,    setRahSuccess]    = useState(false);
  const [rahError,      setRahError]      = useState("");
  const [submitting,    setSubmitting]    = useState(false);

  const getRowTotal = (row: DayRow) =>
    row.MG + row.SPECIALS + row.INTERNES + row.INFIRMIERS + row.SAGE_F + row.PIQUTERIES + row.OFFICINES;

  const getColTotal = (col: keyof DayRow) =>
    JOURS.reduce((sum, j) => sum + tableData[j][col], 0);

  const grandTotal = JOURS.reduce((sum, j) => sum + getRowTotal(tableData[j]), 0);

  const updateCell = (jour: Jour, col: keyof DayRow, val: number) => {
    setTableData(prev => ({ ...prev, [jour]: { ...prev[jour], [col]: val } }));
  };

  const submitRAH = async () => {
    setRahError(""); setRahSuccess(false);
    if (!semaineDu || !semaineAu) {
      setRahError("Veuillez renseigner la période (Du / Au)");
      return;
    }

    const tableStr = JOURS.map(j => {
      const r = tableData[j];
      return `${j}: MG=${r.MG}, SPEC=${r.SPECIALS}, INT=${r.INTERNES}, INF=${r.INFIRMIERS}, SF=${r.SAGE_F}, PIQ=${r.PIQUTERIES}, OFF=${r.OFFICINES}, TOT=${getRowTotal(r)}`;
    }).join(" | ");

    const notesComplet = [
      `=== RAPPORT HEBDOMADAIRE : ${semaineDu} au ${semaineAu}${mois ? ` (${mois})` : ""} ===`,
      secteur       ? `SECTEUR: ${secteur}`                                : "",
      `TABLEAU ACTIVITÉS: ${tableStr}`,
      reflexPharm   ? `RÉFLEXIONS PHARMACEUTIQUES: ${reflexPharm}`         : "",
      reflexMedical ? `RÉFLEXIONS MÉDICALES: ${reflexMedical}`             : "",
      activConc     ? `ACTIVITÉS CONCURRENCE: ${activConc}`                : "",
      propositions  ? `PROPOSITIONS VM: ${propositions}`                   : "",
    ].filter(Boolean).join("\n");

    const body = {
      doctorName:    `Rapport Hebdomadaire - ${semaineDu} au ${semaineAu}`,
      specialty:     "RAPPORT HEBDOMADAIRE",
      notes:         notesComplet,
      productsShown: `Total visites: ${grandTotal}`,
      photos:        [] as string[],
    };

    setSubmitting(true);
    try {
      if (!isOnline()) {
        saveReportOffline({ ...body, visitDate: new Date().toISOString() });
        setRahSuccess(true);
        setSubmitting(false);
        return;
      }
      await api.post("/reports", body);
      qc.invalidateQueries({ queryKey: ["my-reports-dashboard"] });
      setRahSuccess(true);
      setTimeout(() => {
        setTableData(EMPTY_TABLE());
        setReflexPharm(""); setReflexMedical("");
        setActivConc(""); setPropositions("");
        setSemaineDu(""); setSemaineAu(""); setMois("");
        setRahSuccess(false);
        onBack?.();
      }, 2000);
    } catch {
      setRahError("Erreur lors de l'envoi. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* En-tête rapport */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">📅 Période</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Du</label>
            <input type="date" value={semaineDu} onChange={e => setSemaineDu(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Au</label>
            <input type="date" value={semaineAu} onChange={e => setSemaineAu(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Mois</label>
            <input type="text" value={mois} onChange={e => setMois(e.target.value)}
              placeholder="Ex: Janvier" className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Secteur / Zone</label>
          <input type="text" value={secteur} onChange={e => setSecteur(e.target.value)}
            placeholder="Ex: Abidjan Nord" className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
      </div>

      {/* Tableau d'activité */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Tableau d'activité</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-200 bg-gray-50 px-2 py-2 text-left font-semibold text-gray-600 min-w-[72px]" rowSpan={2}>JOURS</th>
                <th className="border border-gray-200 bg-blue-50 px-2 py-1.5 text-center font-bold text-blue-800" colSpan={3}>MÉDECINS</th>
                <th className="border border-gray-200 bg-green-50 px-2 py-1.5 text-center font-bold text-green-800" colSpan={4}>PARA-MÉDICAUX</th>
                <th className="border border-gray-200 bg-slate-100 px-2 py-1.5 text-center font-bold text-slate-700" rowSpan={2}>TOTAL</th>
              </tr>
              <tr>
                {COLS_MED.map(c  => <th key={c} className="border border-gray-200 bg-blue-50 px-1 py-1.5 text-center text-blue-700 font-bold min-w-[40px]">{COL_LABELS[c]}</th>)}
                {COLS_PARA.map(c => <th key={c} className="border border-gray-200 bg-green-50 px-1 py-1.5 text-center text-green-700 font-bold min-w-[40px]">{COL_LABELS[c]}</th>)}
              </tr>
            </thead>
            <tbody>
              {JOURS.map((jour, ji) => {
                const row   = tableData[jour];
                const total = getRowTotal(row);
                return (
                  <tr key={jour} className={ji % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="border border-gray-200 px-2 py-1 font-semibold text-gray-700">{jour}</td>
                    {COLS_MED.map(c => (
                      <td key={c} className="border border-gray-200 p-0">
                        <NumCell value={row[c]} onChange={v => updateCell(jour, c, v)} />
                      </td>
                    ))}
                    {COLS_PARA.map(c => (
                      <td key={c} className="border border-gray-200 p-0">
                        <NumCell value={row[c]} onChange={v => updateCell(jour, c, v)} />
                      </td>
                    ))}
                    <td className="border border-gray-200 px-2 py-1 text-center font-bold text-slate-700">
                      {total > 0 ? total : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-800 text-white font-bold">
                <td className="border border-slate-600 px-2 py-2 text-xs">TOTAUX</td>
                {COLS_MED.map(c  => <td key={c} className="border border-slate-600 px-2 py-2 text-center text-xs">{getColTotal(c) || "—"}</td>)}
                {COLS_PARA.map(c => <td key={c} className="border border-slate-600 px-2 py-2 text-center text-xs">{getColTotal(c) || "—"}</td>)}
                <td className="border border-slate-600 px-2 py-2 text-center text-yellow-300 text-sm">{grandTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sections qualitatives */}
      <div className="space-y-3">
        {[
          { label: "Réflexions du corps pharmaceutique",         value: reflexPharm,   set: setReflexPharm,   color: "border-blue-200 bg-blue-50/40"    },
          { label: "Réflexions du corps médical et paramédical", value: reflexMedical, set: setReflexMedical, color: "border-green-200 bg-green-50/40"   },
          { label: "Activités de la concurrence",                value: activConc,     set: setActivConc,     color: "border-orange-200 bg-orange-50/40" },
          { label: "Propositions et Suggestions du VM",          value: propositions,  set: setPropositions,  color: "border-purple-200 bg-purple-50/40" },
        ].map(({ label, value, set, color }) => (
          <div key={label} className={`bg-white rounded-2xl shadow-sm border p-4 ${color}`}>
            <p className="text-xs font-bold text-gray-700 mb-2 underline underline-offset-2">{label}</p>
            <textarea
              value={value} onChange={e => set(e.target.value)} rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none resize-none bg-white/80"
              placeholder="Saisir vos remarques…"
            />
          </div>
        ))}
      </div>

      {/* Messages */}
      {rahError   && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm font-medium">❌ {rahError}</div>}
      {rahSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center text-emerald-700 font-semibold flex items-center justify-center gap-2">
          <Check size={18} /> Rapport hebdomadaire envoyé !
        </div>
      )}

      {/* Bouton soumettre */}
      <button
        onClick={submitRAH}
        disabled={submitting || rahSuccess}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm"
      >
        {submitting
          ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Envoi en cours…</>
          : <><Save size={16} /> Envoyer le Rapport Hebdomadaire</>
        }
      </button>
    </div>
  );
}