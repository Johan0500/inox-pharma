import { useState }    from "react";
import { useQuery }    from "@tanstack/react-query";
import { Calendar, BarChart2, X, ShieldAlert } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useLab }  from "../../../contexts/LabContext";

const JOURS       = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi"];
const COLS_MED    = ["MG","SPECIALS","INTERNES"];
const COLS_PARA   = ["INFIRMIERS","SAGE_F","PIQUTERIES","OFFICINES"];
const ALL_COLS    = [...COLS_MED, ...COLS_PARA];

export default function ReportsTab() {
  const { user }       = useAuth();
  const { selectedLab } = useLab();

  // ── Contrôle d'accès ─────────────────────────────────────
  const canView = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const [page,           setPage]           = useState(1);
  const [filterDelegate, setFilterDelegate] = useState("");
  const [filterFrom,     setFilterFrom]     = useState("");
  const [filterTo,       setFilterTo]       = useState("");

  const { data, isLoading } = useQuery<{
    reports: any[]; total: number; page: number; pages: number;
  }>({
    queryKey: ["reports-admin", page, filterDelegate, filterFrom, filterTo, selectedLab],
    queryFn:  () => api.get("/reports", {
      params: {
        page, limit: 50,
        delegateId: filterDelegate || undefined,
        from: filterFrom || undefined,
        to:   filterTo   || undefined,
      },
      headers: { "X-Lab": selectedLab || "all" },
    }).then((r) => r.data),
    placeholderData: (prev) => prev,
    enabled: canView,
  });

  const { data: delegates } = useQuery({
    queryKey: ["delegates-list", selectedLab],
    queryFn:  () => api.get("/delegates", { headers: { "X-Lab": selectedLab || "all" } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: canView,
  });

  // ── Accès refusé ─────────────────────────────────────────
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
        <ShieldAlert size={48} className="text-gray-200" />
        <p className="text-lg font-semibold">Accès restreint</p>
        <p className="text-sm text-center max-w-xs">
          Cette section est réservée aux administrateurs et super-administrateurs.
        </p>
      </div>
    );
  }

  // ── Grouper les rapports hebdomadaires ──────────────────
  const getWeekKey = (dateStr: string) => {
    const d   = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon  = new Date(d.setDate(diff));
    return mon.toISOString().split("T")[0];
  };

  // Filtrer uniquement les rapports hebdomadaires
  const reports = (data?.reports || []).filter(
    (r: any) => r.specialty === "RAPPORT HEBDOMADAIRE"
  );

  const hebdoByKey: Record<string, {
    delegate: string; semaine: string; nom: string; secteur: string;
    jours: Record<string, Record<string, number>>;
    reflexionsPharm: string; reflexionsMedical: string;
    activitesConcurrence: string; propositions: string;
    rawNotes: string;
  }> = {};

  reports.forEach((r: any) => {
    const dName = `${r.delegate?.user?.firstName || ""} ${r.delegate?.user?.lastName || ""}`.trim();
    const week  = getWeekKey(r.visitDate);
    const key   = `${r.delegateId}_${week}`;

    if (!hebdoByKey[key]) {
      hebdoByKey[key] = {
        delegate: r.delegateId, semaine: week, nom: dName,
        secteur: r.delegate?.sector?.zoneResidence || "",
        jours: {},
        reflexionsPharm: "", reflexionsMedical: "",
        activitesConcurrence: "", propositions: "",
        rawNotes: r.notes || "",
      };
      JOURS.forEach(j => {
        hebdoByKey[key].jours[j] = {};
        ALL_COLS.forEach(c => { hebdoByKey[key].jours[j][c] = 0; });
      });
    }

    // Parser les notes structurées (format: "Lundi: MG=2, SPEC=1, ...")
    const notes = r.notes || "";
    JOURS.forEach(jour => {
      const regex = new RegExp(`${jour}:\\s*MG=(\\d+),\\s*SPEC=(\\d+),\\s*INT=(\\d+),\\s*INF=(\\d+),\\s*SF=(\\d+),\\s*PIQ=(\\d+),\\s*OFF=(\\d+)`);
      const m = notes.match(regex);
      if (m) {
        hebdoByKey[key].jours[jour]["MG"]         = parseInt(m[1]) || 0;
        hebdoByKey[key].jours[jour]["SPECIALS"]    = parseInt(m[2]) || 0;
        hebdoByKey[key].jours[jour]["INTERNES"]    = parseInt(m[3]) || 0;
        hebdoByKey[key].jours[jour]["INFIRMIERS"]  = parseInt(m[4]) || 0;
        hebdoByKey[key].jours[jour]["SAGE_F"]      = parseInt(m[5]) || 0;
        hebdoByKey[key].jours[jour]["PIQUTERIES"]  = parseInt(m[6]) || 0;
        hebdoByKey[key].jours[jour]["OFFICINES"]   = parseInt(m[7]) || 0;
      }
    });

    // Parser les sections qualitatives
    const parseSection = (tag: string) => {
      const m = notes.match(new RegExp(`${tag}:\\s*(.+?)(?=\\n[A-Z]|$)`, "s"));
      return m ? m[1].trim() : "";
    };
    hebdoByKey[key].reflexionsPharm      = parseSection("RÉFLEXIONS PHARMACEUTIQUES");
    hebdoByKey[key].reflexionsMedical    = parseSection("RÉFLEXIONS MÉDICALES");
    hebdoByKey[key].activitesConcurrence = parseSection("ACTIVITÉS CONCURRENCE");
    hebdoByKey[key].propositions         = parseSection("PROPOSITIONS VM");
  });

  const hebdoList = Object.values(hebdoByKey).sort((a, b) =>
    new Date(b.semaine).getTime() - new Date(a.semaine).getTime()
  );

  return (
    <div className="space-y-4">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar size={22} className="text-emerald-600" />
          Rapports Hebdomadaires
          <span className="text-gray-400 font-normal text-lg ml-1">
            ({hebdoList.length} rapport{hebdoList.length !== 1 ? "s" : ""})
          </span>
        </h2>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filterDelegate}
            onChange={(e) => { setFilterDelegate(e.target.value); setPage(1); }}
            className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">Tous les délégués</option>
            {(delegates || []).map((d: any) => (
              <option key={d.id} value={d.id}>{d.user?.firstName} {d.user?.lastName}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Du</label>
            <input type="date" value={filterFrom}
              onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
              className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Au</label>
            <input type="date" value={filterTo}
              onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
              className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>

          {(filterDelegate || filterFrom || filterTo) && (
            <button
              onClick={() => { setFilterDelegate(""); setFilterFrom(""); setFilterTo(""); setPage(1); }}
              className="flex items-center gap-1 text-red-500 text-sm border border-red-200 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition"
            >
              <X size={13} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Chargement…
        </div>
      ) : hebdoList.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
          <BarChart2 size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Aucun rapport hebdomadaire</p>
          <p className="text-xs mt-1">Les rapports envoyés par les délégués apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-6">
          {hebdoList.map((h, idx) => {
            const monDate = new Date(h.semaine);
            const friDate = new Date(h.semaine);
            friDate.setDate(friDate.getDate() + 4);
            const semStr  = `${monDate.toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit" })} au ${friDate.toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric" })}`;
            const moisStr = monDate.toLocaleDateString("fr-FR", { month:"long", year:"numeric" });

            // Calcul totaux
            const totals: Record<string, number> = {};
            ALL_COLS.forEach(c => {
              totals[c] = JOURS.reduce((s, j) => s + (h.jours[j]?.[c] || 0), 0);
            });
            const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

            return (
              <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* En-tête rapport */}
                <div className="bg-slate-800 text-white px-6 py-4">
                  <h3 className="font-bold text-lg text-center tracking-wide uppercase">
                    Rapport d'Activité Hebdomadaire
                  </h3>
                </div>

                {/* Infos semaine */}
                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <div className="flex gap-2">
                    <span className="font-semibold text-gray-500">SEMAINE :</span>
                    <span className="text-gray-800">{semStr}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-gray-500">Mois :</span>
                    <span className="text-gray-800 capitalize">{moisStr}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-gray-500">NOM :</span>
                    <span className="text-gray-800 font-medium">{h.nom || "—"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-gray-500">Secteur :</span>
                    <span className="text-gray-800">{h.secteur || "—"}</span>
                  </div>
                </div>

                {/* Tableau */}
                <div className="overflow-x-auto px-6 py-4">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 w-24" rowSpan={2}>JOURS</th>
                        <th className="border border-gray-300 bg-blue-50 px-3 py-2 text-center font-semibold text-blue-800" colSpan={3}>MÉDECINS</th>
                        <th className="border border-gray-300 bg-green-50 px-3 py-2 text-center font-semibold text-green-800" colSpan={4}>PARA-MÉDICAUX</th>
                        <th className="border border-gray-300 bg-slate-50 px-3 py-2 text-center font-semibold text-slate-700" rowSpan={2}>TOTAL</th>
                      </tr>
                      <tr>
                        {COLS_MED.map(c  => <th key={c} className="border border-gray-300 bg-blue-50 px-2 py-1.5 text-center text-xs font-semibold text-blue-700 min-w-[52px]">{c}</th>)}
                        {COLS_PARA.map(c => <th key={c} className="border border-gray-300 bg-green-50 px-2 py-1.5 text-center text-xs font-semibold text-green-700 min-w-[64px]">{c.replace("_"," ")}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {JOURS.map((j, ji) => {
                        const rowTotal = ALL_COLS.reduce((s, c) => s + (h.jours[j]?.[c] || 0), 0);
                        return (
                          <tr key={j} className={ji % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                            <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700">{j}</td>
                            {COLS_MED.map(c => (
                              <td key={c} className="border border-gray-200 px-2 py-2 text-center">
                                {h.jours[j]?.[c] > 0 ? <span className="font-semibold text-blue-700">{h.jours[j][c]}</span> : <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                            {COLS_PARA.map(c => (
                              <td key={c} className="border border-gray-200 px-2 py-2 text-center">
                                {h.jours[j]?.[c] > 0 ? <span className="font-semibold text-green-700">{h.jours[j][c]}</span> : <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                            <td className="border border-gray-200 px-2 py-2 text-center font-bold text-slate-700">
                              {rowTotal > 0 ? rowTotal : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-800 text-white font-bold">
                        <td className="border border-slate-600 px-3 py-2">Totaux</td>
                        {COLS_MED.map(c  => <td key={c} className="border border-slate-600 px-2 py-2 text-center">{totals[c] || "—"}</td>)}
                        {COLS_PARA.map(c => <td key={c} className="border border-slate-600 px-2 py-2 text-center">{totals[c] || "—"}</td>)}
                        <td className="border border-slate-600 px-2 py-2 text-center text-yellow-300 text-base">{grandTotal}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Sections qualitatives */}
                <div className="px-6 pb-6 space-y-3">
                  {[
                    { title: "Réflexions du corps pharmaceutique",         content: h.reflexionsPharm,        color: "border-blue-200 bg-blue-50/30"   },
                    { title: "Réflexions du corps médical et paramédical", content: h.reflexionsMedical,      color: "border-green-200 bg-green-50/30" },
                    { title: "Activités de la concurrence",                content: h.activitesConcurrence,   color: "border-orange-200 bg-orange-50/30"},
                    { title: "Propositions et Suggestions du VM",          content: h.propositions,           color: "border-purple-200 bg-purple-50/30"},
                  ].map(({ title, content, color }) => (
                    <div key={title} className={`border rounded-xl p-4 ${color}`}>
                      <p className="text-xs font-bold text-gray-600 mb-2 underline underline-offset-2">{title}</p>
                      <p className="text-sm text-gray-700 min-h-[36px] leading-relaxed whitespace-pre-wrap">
                        {content?.trim() || <span className="text-gray-300 italic">Aucune remarque cette semaine</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} / {data.pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 text-sm bg-white border rounded-xl disabled:opacity-40 hover:bg-gray-50 transition">
              ← Précédent
            </button>
            <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages}
              className="px-4 py-2 text-sm bg-white border rounded-xl disabled:opacity-40 hover:bg-gray-50 transition">
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
