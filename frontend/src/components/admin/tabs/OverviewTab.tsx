import { useQuery }  from "@tanstack/react-query";
import { Users, FileText, Building2, Activity, MapPin } from "lucide-react";
import api from "../../../services/api";
import { useLab } from "../../../contexts/LabContext";

export default function OverviewTab() {
  const { selectedLab, labName, labColor } = useLab();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats", selectedLab],
    queryFn:  () => api.get("/stats", {
      headers: { "X-Lab": selectedLab },
    }).then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: recentReports = [] } = useQuery({
    queryKey: ["recent-reports", selectedLab],
    queryFn:  () => api.get("/reports", {
      params:  { page: 1, limit: 5 },
      headers: { "X-Lab": selectedLab },
    }).then((r) => r.data?.reports || []),
    refetchInterval: 30000,
  });

  const kpis = [
    {
      label: "Total Délégués",
      value: stats?.totalDelegates,
      icon:  Users,
      color: "#3b82f6",
      bg:    "#eff6ff",
    },
    {
      label: "Délégués Actifs",
      value: stats?.activeDelegates,
      icon:  Activity,
      color: "#10b981",
      bg:    "#f0fdf4",
    },
    {
      label: "Rapports de Visite",
      value: stats?.totalReports,
      icon:  FileText,
      color: "#8b5cf6",
      bg:    "#f5f3ff",
    },
    {
      label: "Pharmacies",
      value: stats?.totalPharmacies,
      icon:  Building2,
      color: "#f59e0b",
      bg:    "#fffbeb",
    },
  ];

  return (
    <div className="space-y-6">

      {/* Titre avec labo */}
      <div className="flex items-center gap-3">
        <div className="w-3 h-8 rounded-full" style={{ background: labColor }} />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tableau de bord</h2>
          <p className="text-sm text-gray-400">{labName}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">{label}</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
            </div>
            {isLoading ? (
              <div className="w-16 h-8 bg-gray-100 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold" style={{ color }}>
                {value != null ? Number(value).toLocaleString() : "0"}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Rapports récents */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FileText size={16} className="text-gray-400" />
          Derniers rapports de visite
        </h3>

        {(recentReports as any[]).length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">Aucun rapport récent</p>
        ) : (
          <div className="space-y-3">
            {(recentReports as any[]).map((r: any) => (
              <div key={r.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: labColor + "20" }}>
                  <FileText size={14} style={{ color: labColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">Dr. {r.doctorName}</p>
                  <p className="text-xs text-gray-400">
                    {r.delegate?.user?.firstName} {r.delegate?.user?.lastName}
                    {r.specialty && ` — ${r.specialty}`}
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(r.visitDate).toLocaleDateString("fr-FR", { day:"2-digit", month:"short" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
