import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import api from "../../../services/api";

export default function ReportsTab() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{
  reports: any[];
  total: number;
  page: number;
  pages: number;
}>({
  queryKey: ["reports-admin", page],
  queryFn: () =>
    api.get("/reports", { params: { page, limit: 20 } }).then((r) => r.data),
  placeholderData: (prev) => prev,
});

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }); }
    catch { return d; }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">
        Rapports de Visite{" "}
        <span className="text-gray-400 font-normal text-lg">({data?.total?.toLocaleString() ?? "..."} au total)</span>
      </h2>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : (
        <div className="space-y-3">
          {data?.reports?.map((r: any) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{r.doctorName}</p>
                    {r.specialty && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{r.specialty}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {r.delegate?.user?.firstName} {r.delegate?.user?.lastName}
                    {r.laboratory && <span className="text-gray-400"> — {r.laboratory.name}</span>}
                  </p>
                  {r.pharmacy && (
                    <p className="text-xs text-gray-400">📍 {r.pharmacy.nom}{r.pharmacy.ville && ` — ${r.pharmacy.ville}`}</p>
                  )}
                  {r.productsShown && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Produits :</span> {r.productsShown}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(r.visitDate)}</span>
              </div>
              {r.aiSummary && (
                <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-purple-600 mb-1">✨ Résumé IA (Gemini)</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{r.aiSummary}</p>
                </div>
              )}
            </div>
          ))}
          {(!data?.reports || data.reports.length === 0) && (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
              <FileText size={40} className="mx-auto mb-3 text-gray-300" />
              <p>Aucun rapport de visite pour le moment</p>
            </div>
          )}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} / {data.pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}
              className="px-4 py-2 text-sm bg-white border rounded-xl disabled:opacity-40 hover:bg-gray-50 transition">← Précédent</button>
            <button onClick={() => setPage((p) => Math.min(data.pages, p+1))} disabled={page===data.pages}
              className="px-4 py-2 text-sm bg-white border rounded-xl disabled:opacity-40 hover:bg-gray-50 transition">Suivant →</button>
          </div>
        </div>
      )}
    </div>
  );
}
