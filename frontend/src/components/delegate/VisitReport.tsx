import { useState, useEffect }                   from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, ChevronDown, ChevronUp, Save, Check, Wifi, WifiOff, ClipboardList } from "lucide-react";
import api         from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { isOnline, saveReportOffline } from "../../services/offlineSync";

// ── Types ─────────────────────────────────────────────────────
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;
type Jour = typeof JOURS[number];

interface DayRow {
  MG:        number;
  SPECIALS:  number;
  INTERNES:  number;
  INFIRMIERS: number;
  SAGE_F:    number;
  PIQUTERIES: number;
  OFFICINES: number;
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

// ── Composant numérique pour les cellules ────────────────────
function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number" min={0} max={99}
      value={value === 0 ? "" : value}
      onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
      className="w-full text-center text-sm border-0 outline-none bg-transparent py-1 font-semibold"
      style={{ minWidth: 36 }}
    />
  );
}

export default function VisitReport() {
  const { user }  = useAuth();
  const qc        = useQueryClient();

  // ── Onglets ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"rah" | "visite">("rah");

  // ── RAH (Rapport d'Activité Hebdomadaire) ────────────────
  const [semaineDu,  setSemaineDu]  = useState("");
  const [semaineAu,  setSemaineAu]  = useState("");
  const [mois,       setMois]       = useState("");
  const [secteur,    setSecteur]    = useState((user as any)?.delegate?.sector?.zoneResidence || "");
  const [tableData,  setTableData]  = useState<TableData>(EMPTY_TABLE());
  const [reflexPharm,   setReflexPharm]   = useState("");
  const [reflexMedical, setReflexMedical] = useState("");
  const [activConc,     setActivConc]     = useState("");
  const [propositions,  setPropositions]  = useState("");
  const [rahSuccess,    setRahSuccess]    = useState(false);
  const [rahError,      setRahError]      = useState("");

  // ── Rapport de Visite (existant) ─────────────────────────
  const [form, setForm] = useState({
    doctorName: "", specialty: "", pharmacyId: "", productsShown: "", notes: "",
  });
  const [pharmSearch,    setPharmSearch]    = useState("");
  const [showPharmList,  setShowPharmList]  = useState(false);
  const [success,        setSuccess]        = useState<"online" | "offline" | null>(null);
  const [error,          setError]          = useState("");

  const { data: pharmaciesData } = useQuery({
    queryKey: ["pharmacies-report"],
    queryFn:  () => api.get("/pharmacies", { params: { limit: 1000 } }).then(r => r.data),
  });
  const allPharmacies: any[] = (pharmaciesData?.pharmacies || pharmaciesData || []);
  const filteredPharmacies = pharmSearch
    ? allPharmacies.filter(p => p.nom?.toLowerCase().includes(pharmSearch.toLowerCase())).slice(0, 20)
    : allPharmacies.slice(0, 20);
  const selectedPharmacy = allPharmacies.find(p => p.id === form.pharmacyId);

  // ── Calcul totaux RAH ─────────────────────────────────────
  const getRowTotal = (row: DayRow) =>
    row.MG + row.SPECIALS + row.INTERNES + row.INFIRMIERS + row.SAGE_F + row.PIQUTERIES + row.OFFICINES;

  const getColTotal = (col: keyof DayRow) =>
    JOURS.reduce((sum, j) => sum + tableData[j][col], 0);

  const grandTotal = JOURS.reduce((sum, j) => sum + getRowTotal(tableData[j]), 0);

  const updateCell = (jour: Jour, col: keyof DayRow, val: number) => {
    setTableData(prev => ({ ...prev, [jour]: { ...prev[jour], [col]: val } }));
  };

  // ── Soumission RAH ────────────────────────────────────────
  const submitRAH = async () => {
    setRahError(""); setRahSuccess(false);
    if (!semaineDu || !semaineAu) { setRahError("Veuillez renseigner la période de la semaine"); return; }

    // Convertir le tableau en notes structurées
    const tableStr = JOURS.map(j => {
      const r = tableData[j];
      const total = getRowTotal(r);
      return `${j}: MG=${r.MG}, SPEC=${r.SPECIALS}, INT=${r.INTERNES}, INF=${r.INFIRMIERS}, SF=${r.SAGE_F}, PIQ=${r.PIQUTERIES}, OFF=${r.OFFICINES}, TOT=${total}`;
    }).join(" | ");

    const notesComplet = [
      `=== RAPPORT HEBDOMADAIRE : ${semaineDu} au ${semaineAu} (${mois}) ===`,
      `TABLEAU ACTIVITÉS: ${tableStr}`,
      reflexPharm     ? `RÉFLEXIONS PHARMACEUTIQUES: ${reflexPharm}`     : "",
      reflexMedical   ? `RÉFLEXIONS MÉDICALES: ${reflexMedical}`         : "",
      activConc       ? `ACTIVITÉS CONCURRENCE: ${activConc}`            : "",
      propositions    ? `PROPOSITIONS VM: ${propositions}`               : "",
    ].filter(Boolean).join("\n");

    const body = {
      doctorName:    `Rapport Hebdomadaire - ${semaineDu} au ${semaineAu}`,
      specialty:     "RAPPORT HEBDOMADAIRE",
      notes:         notesComplet,
      productsShown: `Total visites: ${grandTotal}`,
    };

    try {
      if (!isOnline()) {
        saveReportOffline({ ...body, visitDate: new Date().toISOString() });
        setRahSuccess(true);
        return;
      }
      await api.post("/reports", body);
      setRahSuccess(true);
      // Reset
      setTimeout(() => {
        setTableData(EMPTY_TABLE());
        setReflexPharm(""); setReflexMedical("");
        setActivConc(""); setPropositions("");
        setSemaineDu(""); setSemaineAu(""); setMois("");
        setRahSuccess(false);
      }, 2000);
    } catch {
      setRahError("Erreur lors de l'envoi. Réessayez.");
    }
  };

  // ── Soumission rapport visite ─────────────────────────────
  const submitVisite = async () => {
    setError("");
    if (!form.doctorName || !form.notes) { setError("Médecin et notes requis"); return; }
    try {
      if (!isOnline()) {
        saveReportOffline({ ...form, visitDate: new Date().toISOString() });
        setSuccess("offline"); return;
      }
      await api.post("/reports", form);
      setSuccess("online");
      setTimeout(() => {
        setForm({ doctorName: "", specialty: "", pharmacyId: "", productsShown: "", notes: "" });
        setSuccess(null);
      }, 2000);
    } catch { setError("Erreur lors de l'envoi"); }
  };

  const COLS_MED  = ["MG", "SPECIALS", "INTERNES"] as const;
  const COLS_PARA = ["INFIRMIERS", "SAGE_F", "PIQUTERIES", "OFFICINES"] as const;
  const COL_LABELS: Record<string, string> = {
    MG: "MG", SPECIALS: "SPÉC.", INTERNES: "INT.",
    INFIRMIERS: "INF.", SAGE_F: "S.F.", PIQUTERIES: "PIQ.", OFFICINES: "OFF.",
  };

  return (
    <div className="space-y-4">

      {/* Onglets */}
      <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 gap-1">
        <button onClick={() => setActiveTab("rah")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeTab === "rah"
              ? "bg-green-600 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}>
          <ClipboardList size={15} /> Rapport Hebdomadaire
        </button>
        <button onClick={() => setActiveTab("visite")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeTab === "visite"
              ? "bg-green-600 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}>
          <FileText size={15} /> Rapport de Visite
        </button>
      </div>

      {/* ══ ONGLET RAH ══════════════════════════════════════════════════ */}
      {activeTab === "rah" && (
        <div className="space-y-4">

          {/* En-tête formulaire */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-center font-bold text-lg text-gray-800 mb-4 uppercase tracking-wide">
              Rapport d'Activité Hebdomadaire
            </h2>

            {/* Semaine + Mois + Secteur */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Semaine du *</label>
                <input type="date" value={semaineDu} onChange={e => setSemaineDu(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Au *</label>
                <input type="date" value={semaineAu} onChange={e => setSemaineAu(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Mois</label>
                <input value={mois} onChange={e => setMois(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Ex : Avril 2026" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Secteur</label>
                <input value={secteur} onChange={e => setSecteur(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Votre secteur" />
              </div>
            </div>
          </div>

          {/* Tableau d'activité */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-200 bg-gray-50 px-2 py-2 text-left font-semibold text-gray-600 min-w-20" rowSpan={2}>JOURS</th>
                    <th className="border border-gray-200 bg-blue-50 px-2 py-1 text-center font-semibold text-blue-800" colSpan={3}>MÉDECINS</th>
                    <th className="border border-gray-200 bg-green-50 px-2 py-1 text-center font-semibold text-green-800" colSpan={4}>PARA-MÉDICAUX</th>
                    <th className="border border-gray-200 bg-slate-100 px-2 py-1 text-center font-semibold text-slate-700" rowSpan={2}>TOTAL</th>
                  </tr>
                  <tr>
                    {COLS_MED.map(c  => <th key={c} className="border border-gray-200 bg-blue-50 px-1 py-1 text-center text-blue-700 font-bold min-w-10">{COL_LABELS[c]}</th>)}
                    {COLS_PARA.map(c => <th key={c} className="border border-gray-200 bg-green-50 px-1 py-1 text-center text-green-700 font-bold min-w-10">{COL_LABELS[c]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {JOURS.map((jour, ji) => {
                    const row = tableData[jour];
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
                        <td className="border border-gray-200 px-2 py-1 text-center font-bold text-slate-700">{total > 0 ? total : "—"}</td>
                      </tr>
                    );
                  })}
                  {/* Ligne Totaux */}
                  <tr className="bg-slate-800 text-white font-bold">
                    <td className="border border-slate-600 px-2 py-2 text-xs">TOTAUX</td>
                    {COLS_MED.map(c  => <td key={c} className="border border-slate-600 px-2 py-2 text-center text-xs">{getColTotal(c) || "—"}</td>)}
                    {COLS_PARA.map(c => <td key={c} className="border border-slate-600 px-2 py-2 text-center text-xs">{getColTotal(c) || "—"}</td>)}
                    <td className="border border-slate-600 px-2 py-2 text-center text-yellow-300">{grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sections qualitatives */}
          <div className="space-y-3">
            {[
              { label: "Réflexions du corps pharmaceutique",        value: reflexPharm,   set: setReflexPharm,   color: "border-blue-200 bg-blue-50/50" },
              { label: "Réflexions du corps médical et paramédical", value: reflexMedical, set: setReflexMedical, color: "border-green-200 bg-green-50/50" },
              { label: "Activités de la concurrence",               value: activConc,     set: setActivConc,     color: "border-orange-200 bg-orange-50/50" },
              { label: "Propositions et Suggestions du VM",         value: propositions,  set: setPropositions,  color: "border-purple-200 bg-purple-50/50" },
            ].map(({ label, value, set, color }) => (
              <div key={label} className={`bg-white rounded-2xl shadow-sm border p-4 ${color}`}>
                <p className="text-xs font-bold text-gray-700 mb-2 underline">{label}</p>
                <textarea
                  value={value} onChange={e => set(e.target.value)} rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                  placeholder="Saisir vos remarques..." />
              </div>
            ))}
          </div>

          {/* Messages */}
          {rahError   && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">❌ {rahError}</div>}
          {rahSuccess && <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-700 font-semibold"><Check size={20} className="inline mr-2" />Rapport envoyé avec succès !</div>}

          {/* Bouton soumettre */}
          <button onClick={submitRAH}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm">
            <Save size={16} /> Envoyer le Rapport Hebdomadaire
          </button>
        </div>
      )}

      {/* ══ ONGLET RAPPORT DE VISITE ════════════════════════════════════ */}
      {activeTab === "visite" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <FileText size={18} className="text-green-600" /> Rapport de Visite
          </h2>

          {/* Médecin */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Nom du médecin *</label>
            <input value={form.doctorName} onChange={e => setForm(f => ({ ...f, doctorName: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Dr. Nom Prénom" />
          </div>

          {/* Spécialité */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Spécialité</label>
            <select value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Spécialité --</option>
              {["MEDECIN GENERALE","CHIRURGIE","PEDIATRIE","GYNECO-SAGE FEMME","DERMATOLOGIE","DIABETOLOGIE","PNEUMOLOGIE","ORL","RHUMATOLOGIE NEURO TRAUMATO","OPHTALMOLOGIE","AUTRE"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Pharmacie */}
          <div className="relative">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Pharmacie visitée</label>
            {selectedPharmacy ? (
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-green-50 border-green-200">
                <span className="text-sm font-medium text-green-800 flex-1">{selectedPharmacy.nom}</span>
                <button onClick={() => setForm(f => ({ ...f, pharmacyId: "" }))} className="text-gray-400 hover:text-red-500">✕</button>
              </div>
            ) : (
              <input value={pharmSearch} onChange={e => { setPharmSearch(e.target.value); setShowPharmList(true); }}
                onFocus={() => setShowPharmList(true)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Rechercher une pharmacie..." />
            )}
            {showPharmList && !selectedPharmacy && filteredPharmacies.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredPharmacies.map(p => (
                  <button key={p.id} onClick={() => { setForm(f => ({ ...f, pharmacyId: p.id })); setShowPharmList(false); setPharmSearch(""); }}
                    className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm border-b border-gray-50 last:border-0">
                    <span className="font-medium">{p.nom}</span>
                    <span className="text-xs text-gray-400 ml-2">{p.ville}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Produits */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Produits présentés</label>
            <input value={form.productsShown} onChange={e => setForm(f => ({ ...f, productsShown: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="CEXIME, AZIENT, ROLIK..." />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes / Observations *</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={4}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
              placeholder="Résumé de la visite, réactions du médecin..." />
          </div>

          {error   && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">❌ {error}</div>}
          {success && (
            <div className={`rounded-xl p-3 text-center font-semibold text-sm flex items-center justify-center gap-2 ${
              success === "online" ? "bg-green-50 text-green-700 border border-green-200" : "bg-orange-50 text-orange-700 border border-orange-200"
            }`}>
              {success === "online" ? <Wifi size={15} /> : <WifiOff size={15} />}
              {success === "online" ? "Rapport envoyé !" : "Rapport sauvegardé hors-ligne"}
            </div>
          )}

          <button onClick={submitVisite}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm">
            <Save size={16} /> Envoyer le Rapport de Visite
          </button>
        </div>
      )}
    </div>
  );
}
