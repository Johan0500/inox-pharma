import { useQuery } from "@tanstack/react-query";
import { Users, Building2, FileText, MapPin, TrendingUp, Clock } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function OverviewTab() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["stats-dashboard"],
    queryFn: () => api.get("/stats/dashboard").then((r) => r.data),
    refetchInterval: 30000,
  });

  const cards = [
    {
      label: "Total Délégués",
      value: stats?.totalDelegates ?? "—",
      icon: Users,
      color: "bg-blue-500",
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      label: "Actifs maintenant",
      value: stats?.activeDelegates ?? "—",
      icon: MapPin,
      color: "bg-green-500",
      bg: "bg-green-50",
      text: "text-green-600",
    },
    {
      label: "Rapports de visite",
      value: stats?.totalReports?.toLocaleString() ?? "—",
      icon: FileText,
      color: "bg-purple-500",
      bg: "bg-purple-50",
      text: "text-purple-600",
    },
    {
      label: "Pharmacies",
      value: stats?.totalPharmacies?.toLocaleString() ?? "—",
      icon: Building2,
      color: "bg-orange-500",
      bg: "bg-orange-50",
      text: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Bonjour, {user?.firstName} 👋
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg, text }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{label}</p>
                <p className="text-3xl font-bold text-gray-800">{value}</p>
              </div>
              <div className={`${bg} rounded-xl p-3`}>
                <Icon size={22} className={text} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rapports récents */}
      {stats?.recentReports?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            <h3 className="font-semibold text-gray-800">Derniers rapports de visite</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentReports.map((r: any) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{r.doctorName}</p>
                  <p className="text-xs text-gray-400">
                    {r.delegate?.user?.firstName} {r.delegate?.user?.lastName}
                    {r.laboratory && ` — ${r.laboratory.name}`}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {format(new Date(r.visitDate), "dd/MM HH:mm")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bannière de bienvenue */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp size={22} />
          <h3 className="text-lg font-bold">INOX PHARMA</h3>
        </div>
        <p className="text-blue-100 text-sm leading-relaxed">
          Bienvenue sur votre tableau de bord. Gérez vos délégués, suivez leurs déplacements
          en temps réel sur la carte GPS et consultez tous les rapports de visites médicales.
        </p>
        {user?.role === "SUPER_ADMIN" && (
          <p className="text-blue-200 text-xs mt-2">
            ✦ Mode Super Administrateur — accès complet à tous les laboratoires et grossistes
          </p>
        )}
      </div>
    </div>
  );
}
