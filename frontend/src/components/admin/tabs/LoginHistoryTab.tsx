import { useQuery } from "@tanstack/react-query";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import api from "../../../services/api";

export default function LoginHistoryTab() {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["login-history-all"],
    queryFn:  () => api.get("/auth/history/all").then((r) => r.data),
    refetchInterval: 30000,
  });

  const formatDate = (d: string) => new Date(d).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Shield size={22} className="text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Historique des Connexions</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-slate-800 px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold text-white">Toutes les connexions</h3>
          <span className="text-slate-400 text-xs">Actualisation toutes les 30s</span>
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-700 text-slate-200">
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-left font-medium">Utilisateur</th>
                  <th className="px-4 py-3 text-left font-medium">Rôle</th>
                  <th className="px-4 py-3 text-left font-medium">Appareil</th>
                  <th className="px-4 py-3 text-left font-medium">IP</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {(history as any[]).map((h, i) => (
                  <tr key={h.id} className={`border-t hover:bg-gray-50 transition ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                    <td className="px-4 py-3">
                      {h.success
                        ? <span className="flex items-center gap-1 text-green-600 text-xs font-semibold"><CheckCircle size={14}/>Réussie</span>
                        : <span className="flex items-center gap-1 text-red-600 text-xs font-semibold"><XCircle size={14}/>Échouée</span>
                      }
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {h.user?.firstName} {h.user?.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        h.user?.role === "SUPER_ADMIN" ? "bg-red-100 text-red-700" :
                        h.user?.role === "ADMIN"       ? "bg-purple-100 text-purple-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {h.user?.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{h.deviceInfo || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{h.ipAddress || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(h.createdAt)}</td>
                  </tr>
                ))}
                {(history as any[]).length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">Aucun historique</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
