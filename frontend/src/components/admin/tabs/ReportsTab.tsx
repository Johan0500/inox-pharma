import { useState }                              from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Download, X, Calendar, BarChart2 } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";

// ── Format Rapport d'Activité Hebdomadaire (selon document PDF) ──
const JOURS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi"];
const COLS_MEDECINS = ["MG","SPECIALS","INTERNES"];
const COLS_PARA     = ["INFIRMIERS","SAGE_F","PIQUTERIES","OFFICINES"];

type ViewMode = "liste" | "hebdo";

export default function ReportsTab() {
  const { user }  = useAuth();
  const qc        = useQueryClient();
  const [page,    setPage]    = useState(1);
  const [delId,   setDelId]   = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [view,    setView]    = useState<ViewMode>("liste");

  // Filtres
  const [filterDelegate, setFilterDelegate] = useState("");
  const [filterFrom,     setFilterFrom]     = useState("");
  const [filterTo,       setFilterTo]       = useState("");

  const { data, isLoading } = useQuery<{
    reports: any[]; total: number; page: number; pages: number;
  }>({
    queryKey: ["reports-admin", page, filterDelegate, filterFrom, filterTo],
    queryFn:  () => api.get("/reports", { params: {
      page, limit: 20,
      delegateId: filterDelegate || undefined,
      from: filterFrom || undefined,
      to:   filterTo   || undefined,
    }}).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: delegates } = useQuery({
    queryKey: ["delegates-list"],
    queryFn:  () => api.get("/delegates").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const deleteReport = useMutation({
    mutationFn: (id: string) => api.delete(`/reports/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["reports-admin"] }); setDelId(null); setPreview(null); },
  });

  const exportPDF = () => {
    window.open(
      `${import.meta.env.VITE_API_URL || "https://inox-pharma-0gkr.onrender.com/api"}/reports/export/pdf`,
      "_blank"
    );
  };

  const fmt = (d: string) => {
    try { return new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }); }
    catch { return d; }
  };

  const canDelete = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const reports   = data?.reports || [];

  // ── Grouper les rapports par semaine (pour vue hebdo) ────
  const getWeekKey = (dateStr: string) => {
    const d   = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return mon.toISOString().split("T")[0];
  };

  // Construire les données hebdo à partir des rapports
  const hebdoByDelegate: Record<string, {
    delegate: string; semaine: string; nom: string; secteur: string;
    jours: Record<string, Record<string, number>>;
    reflexionsPharm: string; reflexionsMedical: string;
    activitesConcurrence: string; propositions: string;
  }> = {};

  reports.forEach((r: any) => {
    const dName = `${r.delegate?.user?.firstName || ""} ${r.delegate?.user?.lastName || ""}`.trim();
    const week  = getWeekKey(r.visitDate);
    const key   = `${r.delegateId}_${week}`;
    if (!hebdoByDelegate[key]) {
      hebdoByDelegate[key] = {
        delegate: r.delegateId, semaine: week, nom: dName,
        secteur: r.delegate?.sector?.zoneResidence || "",
        jours: {},
        reflexionsPharm: "", reflexionsMedical: "",
        activitesConcurrence: "", propositions: "",
      };
      JOURS.forEach(j => {
        hebdoByDelegate[key].jours[j] = {};
        [...COLS_MEDECINS, ...COLS_PARA].forEach(c => { hebdoByDelegate[key].jours[j][c] = 0; });
      });
    }
    // Remplir selon le jour de la semaine
    const d   = new Date(r.visitDate);
    const wd  = d.getDay();
    const jour = ["","Lundi","Mardi","Mercredi","Jeudi","Vendredi",""][wd] || "";
    if (jour && hebdoByDelegate[key].jours[jour]) {
      const spec  = (r.specialty || "").toUpperCase();
      const note  = r.notes || "";
      // Médecins généraux
      if (spec === "MEDECIN GENERALE" || spec === "MG") hebdoByDelegate[key].jours[jour]["MG"]++;
      else if (spec === "CHIRURGIE" || spec === "PEDIATRIE" || spec === "GYNECO-SAGE FEMME" || spec === "NEPHROLOGIE")
        hebdoByDelegate[key].jours[jour]["SPECIALS"]++;
      else if (spec.includes("INTERNE")) hebdoByDelegate[key].jours[jour]["INTERNES"]++;
      // Para-médicaux
      else if (spec.includes("INFIRMIER")) hebdoByDelegate[key].jours[jour]["INFIRMIERS"]++;
      else if (spec.includes("SAGE")) hebdoByDelegate[key].jours[jour]["SAGE_F"]++;
      else if (spec.includes("PIQU")) hebdoByDelegate[key].jours[jour]["PIQUTERIES"]++;
      else if (spec.includes("OFFICINE") || spec === "" ) hebdoByDelegate[key].jours[jour]["OFFICINES"]++;
      // Notes
      if (note.toLowerCase().includes("pharmacie")) hebdoByDelegate[key].reflexionsPharm += note + " ";
      else if (note.toLowerCase().includes("médecin") || note.toLowerCase().includes("concurrence"))
        hebdoByDelegate[key].activitesConcurrence += note + " ";
      else hebdoByDelegate[key].reflexionsMedical += note + " ";
    }
  });

  const hebdoList = Object.values(hebdoByDelegate);

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">
          Rapports de Visite
          <span className="text-gray-400 font-normal text-lg ml-2">({data?.total?.toLocaleString() ?? "..."} au total)</span>
        </h2>
        <div className="flex gap-2 flex-wrap">
          {/* Toggle vue */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => setView("liste")}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition flex items-center gap-1.5
                ${view === "liste" ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>
              <FileText size={13} /> Liste
            </button>
            <button onClick={() => setView("hebdo")}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition flex items-center gap-1.5
                ${view === "hebdo" ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>
              <Calendar size={13} /> Hebdomadaire
            </button>
          </div>
          <button onClick={exportPDF}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
            <Download size={15} /> Exporter PDF
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3">
          <select value={filterDelegate} onChange={(e) => { setFilterDelegate(e.target.value); setPage(1); }}
            className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
            <option value="">Tous les délégués</option>
            {(delegates || []).map((d: any) => (
              <option key={d.id} value={d.id}>{d.user?.firstName} {d.user?.lastName}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Du</label>
            <input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
              className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Au</label>
            <input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
              className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          {(filterDelegate || filterFrom || filterTo) && (
            <button onClick={() => { setFilterDelegate(""); setFilterFrom(""); setFilterTo(""); setPage(1); }}
              className="flex items-center gap-1 text-red-500 text-sm border border-red-200 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition">
              <X size={13} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Chargement...
        </div>
      ) : view === "liste" ? (
        /* ── VUE LISTE ── */
        <div className="space-y-3">
          {reports.map((r: any) => (
            <div key={r.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer"
              onClick={() => setPreview(r)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">Dr. {r.doctorName}</p>
                    {r.specialty && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{r.specialty}</span>}
                    {r.laboratory && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{r.laboratory.name}</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{r.delegate?.user?.firstName} {r.delegate?.user?.lastName}</p>
                  {r.pharmacy && <p className="text-xs text-gray-400 mt-0.5">📍 {r.pharmacy.nom}{r.pharmacy.ville ? ` — ${r.pharmacy.ville}` : ""}</p>}
                  {r.productsShown && <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Produits :</span> {r.productsShown}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">{fmt(r.visitDate)}</span>
                  {canDelete && (
                    <button onClick={(e) => { e.stopPropagation(); setDelId(r.id); }}
                      className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              {r.aiSummary && (
                <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-purple-600 mb-1">✨ Résumé IA</p>
                  <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{r.aiSummary}</p>
                </div>
              )}
            </div>
          ))}
          {reports.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
              <FileText size={40} className="mx-auto mb-3 text-gray-200" />
              <p>Aucun rapport de visite</p>
            </div>
          )}
        </div>
      ) : (
        /* ── VUE HEBDOMADAIRE (format Rapport d'Activité) ── */
        <div className="space-y-6">
          {hebdoList.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
              <BarChart2 size={40} className="mx-auto mb-3 text-gray-200" />
              <p>Aucun rapport hebdomadaire</p>
            </div>
          ) : hebdoList.map((h, idx) => {
            const monDate = new Date(h.semaine);
            const friDate = new Date(h.semaine);
            friDate.setDate(friDate.getDate() + 4);
            const semStr = `${monDate.toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit" })} au ${friDate.toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric" })}`;
            const moisStr = monDate.toLocaleDateString("fr-FR", { month:"long", year:"numeric" });

            // Calcul totaux
            const totals: Record<string, number> = {};
            [...COLS_MEDECINS, ...COLS_PARA].forEach(c => {
              totals[c] = JOURS.reduce((s, j) => s + (h.jours[j]?.[c] || 0), 0);
            });
            const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

            return (
              <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* En-tête rapport */}
                <div className="bg-slate-800 text-white px-6 py-4">
                  <h3 className="font-bold text-lg text-center tracking-wide">RAPPORT D'ACTIVITÉ HEBDOMADAIRE</h3>
                </div>

                {/* Infos semaine */}
                <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-4 text-sm">
                  <div className="flex gap-2">
                    <span className="font-semibold text-gray-500">SEMAINE :</span>
                    <span className="text-gray-800">{semStr}</span>
                    <span className="font-semibold text-gray-500 ml-4">Mois :</span>
                    <span className="text-gray-800">{moisStr}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-gray-500">NOM :</span>
                    <span className="text-gray-800 font-medium">{h.nom}</span>
                    <span className="font-semibold text-gray-500 ml-4">Secteur :</span>
                    <span className="text-gray-800">{h.secteur || "—"}</span>
                  </div>
                </div>

                {/* Tableau d'activité */}
                <div className="overflow-x-auto px-6 py-4">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 w-24" rowSpan={2}>JOURS</th>
                        <th className="border border-gray-300 bg-blue-50 px-3 py-2 text-center font-semibold text-blue-800" colSpan={3}>MÉDECINS</th>
                        <th className="border border-gray-300 bg-green-50 px-3 py-2 text-center font-semibold text-green-800" colSpan={4}>PARA - MÉDICAUX</th>
                        <th className="border border-gray-300 bg-slate-50 px-3 py-2 text-center font-semibold text-slate-700" rowSpan={2}>TOTAL</th>
                      </tr>
                      <tr>
                        {COLS_MEDECINS.map(c => (
                          <th key={c} className="border border-gray-300 bg-blue-50 px-2 py-1.5 text-center text-xs font-semibold text-blue-700 min-w-16">{c}</th>
                        ))}
                        {COLS_PARA.map(c => (
                          <th key={c} className="border border-gray-300 bg-green-50 px-2 py-1.5 text-center text-xs font-semibold text-green-700 min-w-16">{c.replace("_"," ")}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {JOURS.map((j, ji) => {
                        const rowTotal = [...COLS_MEDECINS, ...COLS_PARA].reduce((s, c) => s + (h.jours[j]?.[c] || 0), 0);
                        return (
                          <tr key={j} className={ji % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                            <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700">{j}</td>
                            {COLS_MEDECINS.map(c => (
                              <td key={c} className="border border-gray-200 px-2 py-2 text-center text-gray-800">
                                {h.jours[j]?.[c] > 0 ? <span className="font-semibold text-blue-700">{h.jours[j][c]}</span> : <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                            {COLS_PARA.map(c => (
                              <td key={c} className="border border-gray-200 px-2 py-2 text-center text-gray-800">
                                {h.jours[j]?.[c] > 0 ? <span className="font-semibold text-green-700">{h.jours[j][c]}</span> : <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                            <td className="border border-gray-200 px-2 py-2 text-center font-bold text-slate-700">{rowTotal > 0 ? rowTotal : "—"}</td>
                          </tr>
                        );
                      })}
                      {/* Ligne Totaux */}
                      <tr className="bg-slate-800 text-white font-bold">
                        <td className="border border-slate-600 px-3 py-2">Totaux</td>
                        {COLS_MEDECINS.map(c => (
                          <td key={c} className="border border-slate-600 px-2 py-2 text-center">{totals[c] || "—"}</td>
                        ))}
                        {COLS_PARA.map(c => (
                          <td key={c} className="border border-slate-600 px-2 py-2 text-center">{totals[c] || "—"}</td>
                        ))}
                        <td className="border border-slate-600 px-2 py-2 text-center text-yellow-300">{grandTotal}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Sections qualitatives */}
                <div className="px-6 pb-6 space-y-4">
                  {[
                    { title: "Réflexions du corps pharmaceutique",       content: h.reflexionsPharm,        color: "border-blue-200 bg-blue-50/30" },
                    { title: "Réflexions du corps médical et paramédical", content: h.reflexionsMedical,     color: "border-green-200 bg-green-50/30" },
                    { title: "Activités de la concurrence",               content: h.activitesConcurrence,   color: "border-orange-200 bg-orange-50/30" },
                    { title: "Propositions et Suggestions du VM",         content: h.propositions,           color: "border-purple-200 bg-purple-50/30" },
                  ].map(({ title, content, color }) => (
                    <div key={title} className={`border rounded-xl p-4 ${color}`}>
                      <p className="text-xs font-bold text-gray-600 mb-2 underline">{title}</p>
                      <p className="text-sm text-gray-700 min-h-[40px] leading-relaxed whitespace-pre-wrap">
                        {content.trim() || <span className="text-gray-300 italic">Aucune remarque cette semaine</span>}
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
              className="px-4 py-2 text-sm bg-white border rounded-xl disabled:opacity-40 hover:bg-gray-50 transition">← Précédent</button>
            <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages}
              className="px-4 py-2 text-sm bg-white border rounded-xl disabled:opacity-40 hover:bg-gray-50 transition">Suivant →</button>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-gray-800">Détail du rapport</h3>
              <div className="flex items-center gap-2">
                {canDelete && (
                  <button onClick={() => setDelId(preview.id)}
                    className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition">
                    <Trash2 size={13} /> Supprimer
                  </button>
                )}
                <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Médecin",     value: `Dr. ${preview.doctorName}` },
                  { label: "Spécialité",  value: preview.specialty           },
                  { label: "Délégué",     value: `${preview.delegate?.user?.firstName || ""} ${preview.delegate?.user?.lastName || ""}` },
                  { label: "Laboratoire", value: preview.laboratory?.name    },
                  { label: "Pharmacie",   value: preview.pharmacy?.nom       },
                  { label: "Ville",       value: preview.pharmacy?.ville     },
                  { label: "Date",        value: fmt(preview.visitDate)      },
                  { label: "Produits",    value: preview.productsShown       },
                ].filter((i) => i.value).map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
              {preview.notes && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{preview.notes}</p>
                </div>
              )}
              {preview.aiSummary && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-purple-600 mb-2">✨ Résumé IA</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{preview.aiSummary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {delId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setDelId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-center mb-2">Supprimer ce rapport ?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Annuler</button>
              <button onClick={() => deleteReport.mutate(delId)} disabled={deleteReport.isPending}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition disabled:opacity-60">
                {deleteReport.isPending ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
