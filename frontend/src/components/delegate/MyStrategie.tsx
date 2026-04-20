// frontend/src/components/delegate/MyStrategie.tsx
// Affiche les stratégies du laboratoire du délégué (lecture seule)

import { useQuery }  from "@tanstack/react-query";
import { BookOpen, Target, MapPin, Package, Calendar, Clock, CheckCircle2, AlertCircle, Play } from "lucide-react";
import api           from "../../services/api";
import { useAuth }   from "../../contexts/AuthContext";

function StatusBadge({ startDate, endDate }: { startDate?: string; endDate?: string }) {
  const now   = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end   = endDate   ? new Date(endDate)   : null;

  if (end && now > end) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
        <CheckCircle2 size={11} /> Terminée
      </span>
    );
  }
  if (start && now < start) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
        <Clock size={11} /> À venir
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <Play size={11} /> En cours
    </span>
  );
}

function formatDate(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function MyStrategie() {
  const { user } = useAuth();
  const now = new Date();

  // Récupère les stratégies du labo du délégué
  // L'API /strategies filtre automatiquement par labo pour un DELEGATE
  const { data: strategies = [], isLoading } = useQuery({
    queryKey: ["my-strategies"],
    queryFn:  () => api.get("/strategies").then((r) => r.data),
    staleTime: 60_000,
  });

  // Sépare les stratégies en cours / à venir / terminées
  const actives   = (strategies as any[]).filter((s) => {
    const end   = s.endDate   ? new Date(s.endDate)   : null;
    const start = s.startDate ? new Date(s.startDate) : null;
    return (!end || now <= end) && (!start || now >= start);
  });
  const aVenir    = (strategies as any[]).filter((s) => s.startDate && new Date(s.startDate) > now);
  const terminees = (strategies as any[]).filter((s) => s.endDate && new Date(s.endDate) < now);

  const StrategieCard = ({ s }: { s: any }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">

      {/* Titre + statut */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-gray-800 text-base leading-tight">{s.title}</h3>
        <StatusBadge startDate={s.startDate} endDate={s.endDate} />
      </div>

      {/* Description */}
      {s.description && (
        <p className="text-sm text-gray-600 leading-relaxed">{s.description}</p>
      )}

      {/* Détails */}
      <div className="flex flex-wrap gap-2">
        {s.targetProduct && (
          <div className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full border border-blue-100">
            <Package size={11} /> {s.targetProduct}
          </div>
        )}
        {s.targetZone && (
          <div className="flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1 rounded-full border border-purple-100">
            <MapPin size={11} /> {s.targetZone}
          </div>
        )}
      </div>

      {/* Dates */}
      {(s.startDate || s.endDate) && (
        <div className="flex items-center gap-2 text-xs text-gray-400 pt-1 border-t border-gray-50">
          <Calendar size={12} />
          {s.startDate && <span>Début : <strong className="text-gray-600">{formatDate(s.startDate)}</strong></span>}
          {s.startDate && s.endDate && <span className="text-gray-300">•</span>}
          {s.endDate && <span>Fin : <strong className="text-gray-600">{formatDate(s.endDate)}</strong></span>}
        </div>
      )}

      {/* Créé par */}
      <p className="text-xs text-gray-400">
        Définie par <span className="font-medium text-gray-500">
          {s.createdBy?.firstName} {s.createdBy?.lastName}
        </span>
      </p>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div>
        <div className="flex items-center gap-3">
          <BookOpen size={22} className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">Stratégies</h2>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Stratégies commerciales définies par votre laboratoire
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Chargement…</div>
      ) : (strategies as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center space-y-3">
          <BookOpen size={44} className="mx-auto text-gray-300" />
          <p className="font-semibold text-gray-500">Aucune stratégie définie</p>
          <p className="text-sm text-gray-400">Votre administrateur n'a pas encore créé de stratégie pour ce mois.</p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* En cours */}
          {actives.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  En cours ({actives.length})
                </h3>
              </div>
              {actives.map((s: any) => <StrategieCard key={s.id} s={s} />)}
            </div>
          )}

          {/* À venir */}
          {aVenir.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  À venir ({aVenir.length})
                </h3>
              </div>
              {aVenir.map((s: any) => <StrategieCard key={s.id} s={s} />)}
            </div>
          )}

          {/* Terminées */}
          {terminees.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Terminées ({terminees.length})
                </h3>
              </div>
              {terminees.map((s: any) => <StrategieCard key={s.id} s={s} />)}
            </div>
          )}

        </div>
      )}
    </div>
  );
}