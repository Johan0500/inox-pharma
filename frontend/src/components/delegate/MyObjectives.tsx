// frontend/src/components/delegate/MyObjectives.tsx
// Affiche uniquement le suivi CA mensuel du laboratoire (lecture seule)

import { useQuery }    from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, ChevronRight, Target, Zap, Calendar,
} from "lucide-react";
import api from "../../services/api";

function formatFCFA(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toLocaleString("fr-FR") + " F";
}

function ProgressBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const color  =
    pct >= 100 ? "#10b981" :
    pct >= 70  ? "#3b82f6" :
    pct >= 40  ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-full bg-white/10 rounded-full h-5 overflow-hidden">
      <div
        className="h-5 rounded-full transition-all duration-700"
        style={{ width: `${capped}%`, background: color }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
        {pct}%
      </span>
    </div>
  );
}

export default function MyObjectives() {
  const now = new Date();

  const { data: dash, isLoading } = useQuery({
    queryKey:        ["ca-dashboard-delegate"],
    queryFn:         () => api.get("/sales-reports/ca-dashboard").then((r) => r.data),
    refetchInterval: 60_000,
    staleTime:       30_000,
  });

  const statutConfig = {
    ATTEINT:      { icon: <CheckCircle2 size={16} className="text-emerald-400"/>, label: "Objectif atteint 🎉",       color: "text-emerald-300", bg: "bg-emerald-900/30 border-emerald-700" },
    EN_AVANCE:    { icon: <TrendingUp   size={16} className="text-blue-400"/>,    label: "En avance sur l'objectif", color: "text-blue-300",    bg: "bg-blue-900/30 border-blue-700"       },
    EN_RETARD:    { icon: <TrendingDown size={16} className="text-amber-400"/>,   label: "En retard sur l'objectif", color: "text-amber-300",   bg: "bg-amber-900/30 border-amber-700"     },
    PAS_OBJECTIF: { icon: <AlertCircle  size={16} className="text-gray-500"/>,    label: "Pas d'objectif défini",    color: "text-gray-400",    bg: "bg-gray-800 border-gray-700"          },
  };
  const sc = statutConfig[(dash?.statut as keyof typeof statutConfig) ?? "PAS_OBJECTIF"];

  return (
    <div className="space-y-4">

      {/* En-tête */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">Objectif CA</h2>
        <p className="text-sm text-gray-400 capitalize">
          {now.toLocaleString("fr-FR", { month: "long", year: "numeric" })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Chargement…</div>
      ) : !dash || dash.targetCA === 0 ? (

        /* Pas d'objectif défini */
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center space-y-3">
          <Target size={44} className="mx-auto text-gray-300" />
          <p className="font-semibold text-gray-500">Aucun objectif CA ce mois</p>
          <p className="text-sm text-gray-400">L'administrateur n'a pas encore défini l'objectif de votre laboratoire.</p>
        </div>

      ) : (

        <div className="space-y-4">

          {/* Carte principale sombre */}
          <div className="bg-slate-800 rounded-2xl p-5 text-white space-y-4">

            {/* Titre + statut */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-blue-400" />
                <p className="font-bold text-sm">CA Mensuel — {dash.laboratoryName ?? "Laboratoire"}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${sc.bg} ${sc.color}`}>
                {sc.icon} {sc.label}
              </div>
            </div>

            {/* Réalisé vs Objectif */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs">CA réalisé</p>
                <p className="text-2xl font-extrabold">{formatFCFA(dash.caRealise)}</p>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
              <div className="text-right">
                <p className="text-slate-400 text-xs">Objectif du mois</p>
                <p className="text-2xl font-extrabold text-blue-400">{formatFCFA(dash.targetCA)}</p>
              </div>
            </div>

            {/* Barre de progression */}
            <ProgressBar pct={dash.progressPct ?? 0} />

            <div className="flex justify-between text-xs text-slate-400">
              <span>0 F</span>
              <span>{dash.progressPct ?? 0}% atteint</span>
              <span>{formatFCFA(dash.targetCA)}</span>
            </div>
          </div>

          {/* Grille métriques */}
          <div className="grid grid-cols-2 gap-3">

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-1">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase">
                <Target size={13} /> Reste à faire
              </div>
              <p className={`text-xl font-extrabold ${dash.caRestant > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {formatFCFA(dash.caRestant)}
              </p>
              <p className="text-xs text-gray-400">sur {dash.joursRestants} jours restants</p>
            </div>

            <div className="bg-orange-50 rounded-2xl border border-orange-100 shadow-sm p-4 space-y-1">
              <div className="flex items-center gap-2 text-orange-400 text-xs font-medium uppercase">
                <Zap size={13} /> Rythme nécessaire
              </div>
              <p className="text-xl font-extrabold text-orange-600">
                {isFinite(dash.rythmeNecessaire) ? formatFCFA(dash.rythmeNecessaire) + "/j" : "—"}
              </p>
              <p className="text-xs text-gray-400">pour atteindre l'objectif</p>
            </div>

            <div className="bg-blue-50 rounded-2xl border border-blue-100 shadow-sm p-4 space-y-1">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-medium uppercase">
                <TrendingUp size={13} /> Rythme actuel
              </div>
              <p className="text-xl font-extrabold text-blue-700">
                {formatFCFA(dash.rythmeActuel)}/j
              </p>
              <p className="text-xs text-gray-400">{dash.jourDonnees} jours de données (J-1)</p>
            </div>

            <div className={`rounded-2xl border shadow-sm p-4 space-y-1 ${dash.projectionFinMois >= dash.targetCA ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
              <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase">
                <Calendar size={13} /> Projection fin mois
              </div>
              <p className={`text-xl font-extrabold ${dash.projectionFinMois >= dash.targetCA ? "text-emerald-700" : "text-amber-700"}`}>
                {formatFCFA(dash.projectionFinMois)}
              </p>
              <p className="text-xs text-gray-400">au rythme actuel</p>
            </div>
          </div>

          {/* Alerte retard */}
          {dash.statut === "EN_RETARD" && isFinite(dash.rythmeNecessaire) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-amber-800 text-sm">
                Il faut <strong>{formatFCFA(dash.rythmeNecessaire)}/jour</strong> pour atteindre l'objectif.
                Le rythme actuel est de <strong>{formatFCFA(dash.rythmeActuel)}/jour</strong> — soit{" "}
                <strong>{formatFCFA(dash.rythmeNecessaire - dash.rythmeActuel)}/jour</strong> de moins que nécessaire.
              </p>
            </div>
          )}

          {/* Succès */}
          {dash.statut === "ATTEINT" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <p className="font-semibold text-emerald-800 text-sm">
                🎉 Objectif atteint ! <strong>{formatFCFA(dash.caRealise)}</strong> réalisés sur <strong>{formatFCFA(dash.targetCA)}</strong>.
              </p>
            </div>
          )}

          {/* Note décalage */}
          <p className="text-xs text-gray-400 text-center">
            Les données ont un décalage de J-1 — dernière mise à jour :{" "}
            {new Date(new Date().setDate(new Date().getDate() - 1))
              .toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
          </p>
        </div>
      )}
    </div>
  );
}