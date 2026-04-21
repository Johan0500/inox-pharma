import { useQuery } from "@tanstack/react-query";
import { Users, MapPin } from "lucide-react";
import api from "../../../services/api";

const STATUS_COLORS: Record<string, string> = {
  EN_VISITE:      "bg-green-100 text-green-700",
  EN_DEPLACEMENT: "bg-blue-100 text-blue-700",
  EN_PAUSE:       "bg-yellow-100 text-yellow-700",
  INACTIF:        "bg-gray-100 text-gray-500",
};

export default function DelegatesTab() {
  const { data: delegates = [], isLoading } = useQuery({
    queryKey: ["delegates"],
    queryFn:  () => api.get("/delegates").then((r) => r.data),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          Délégués Médicaux{" "}
          <span className="text-gray-400 font-normal text-lg">
            ({(delegates as any[]).length})
          </span>
        </h2>
        <span className="text-xs text-gray-400">Actualisation toutes les 15s</span>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(delegates as any[]).map((d) => (
            <div key={d.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden border border-gray-100"
                    style={{ background: d.user.avatar ? "transparent" : "linear-gradient(135deg,#059669,#065f46)" }}>
                    {d.user.avatar
                      ? <img src={d.user.avatar} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                          {d.user.firstName?.[0]}{d.user.lastName?.[0]}
                        </div>
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {d.user.firstName} {d.user.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{d.user.email}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  d.user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                }`}>
                  {d.user.isActive ? "Actif" : "Inactif"}
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={14} className="text-blue-400 flex-shrink-0" />
                  <span className="truncate">{d.zone || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Labo :</span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {d.laboratory.name}
                  </span>
                </div>
                {d.sector && (
                  <p className="text-xs text-gray-400 truncate">
                    Secteur : {d.sector.zoneResidence}
                  </p>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[d.status] || STATUS_COLORS.INACTIF}`}>
                  ● {d.status.replace(/_/g, " ")}
                </span>
                {d.lastSeen && (
                  <span className="text-xs text-gray-400 ml-2">
                    Vu : {new Date(d.lastSeen).toLocaleTimeString("fr-FR")}
                  </span>
                )}
              </div>
            </div>
          ))}
          {(delegates as any[]).length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <Users size={40} className="mx-auto mb-3 text-gray-300" />
              <p>Aucun délégué — créez des accès dans l'onglet Utilisateurs</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
