import { useState }                              from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Download, X }         from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";

export default function ReportsTab() {
  const { user }  = useAuth();
  const qc        = useQueryClient();
  const [page,    setPage]    = useState(1);
  const [delId,   setDelId]   = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);

  const { data, isLoading } = useQuery<{
    reports: any[]; total: number; page: number; pages: number;
  }>({
    queryKey: ["reports-admin", page],
    queryFn:  () => api.get("/reports", { params: { page, limit: 20 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const deleteReport = useMutation({
    mutationFn: (id: string) => api.delete(`/reports/${id}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["reports-admin"] });
      setDelId(null);
      setPreview(null);
    },
  });

  const exportPDF = () => {
    window.open(
      `${import.meta.env.VITE_API_URL || "https://inox-pharma-0gkr.onrender.com/api"}/reports/export/pdf`,
      "_blank"
    );
  };

  const fmt = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return d; }
  };

  const canDelete = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  return (
    <div className="space-y-4">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">
          Rapports de Visite
          <span className="text-gray-400 font-normal text-lg ml-2">
            ({data?.total?.toLocaleString() ?? "..."} au total)
          </span>
        </h2>
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          <Download size={15} /> Exporter PDF
        </button>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Chargement...
        </div>
      ) : (
        <div className="space-y-3">
          {data?.reports?.map((r: any) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer"
              onClick={() => setPreview(r)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">Dr. {r.doctorName}</p>
                    {r.specialty && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {r.specialty}
                      </span>
                    )}
                    {r.laboratory && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        {r.laboratory.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {r.delegate?.user?.firstName} {r.delegate?.user?.lastName}
                  </p>
                  {r.pharmacy && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      📍 {r.pharmacy.nom}{r.pharmacy.ville ? ` — ${r.pharmacy.ville}` : ""}
                    </p>
                  )}
                  {r.productsShown && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Produits :</span> {r.productsShown}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">{fmt(r.visitDate)}</span>
                  {canDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDelId(r.id); }}
                      className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition"
                      title="Supprimer ce rapport"
                    >
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

          {(!data?.reports || data.reports.length === 0) && (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
              <FileText size={40} className="mx-auto mb-3 text-gray-200" />
              <p>Aucun rapport de visite</p>
            </div>
          )}
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

      {/* Modal détail rapport */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-gray-800">Détail du rapport</h3>
              <div className="flex items-center gap-2">
                {canDelete && (
                  <button
                    onClick={() => setDelId(preview.id)}
                    className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition"
                  >
                    <Trash2 size={13} /> Supprimer
                  </button>
                )}
                <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Médecin",    value: `Dr. ${preview.doctorName}` },
                  { label: "Spécialité", value: preview.specialty           },
                  { label: "Délégué",    value: `${preview.delegate?.user?.firstName || ""} ${preview.delegate?.user?.lastName || ""}` },
                  { label: "Laboratoire",value: preview.laboratory?.name    },
                  { label: "Pharmacie",  value: preview.pharmacy?.nom       },
                  { label: "Ville",      value: preview.pharmacy?.ville     },
                  { label: "Date",       value: fmt(preview.visitDate)      },
                  { label: "Produits",   value: preview.productsShown       },
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
                  <p className="text-xs font-bold text-purple-600 mb-2">✨ Résumé IA (Gemini)</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{preview.aiSummary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {delId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
          onClick={() => setDelId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-center mb-2">Supprimer ce rapport ?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Annuler
              </button>
              <button
                onClick={() => deleteReport.mutate(delId)}
                disabled={deleteReport.isPending}
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
