// frontend/src/components/admin/tabs/ObjectivesTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Onglet Objectifs Admin — relié aux Chiffres (CA mensuel)
// Décalage J-1 géré côté backend : les données saisies aujourd'hui
// correspondent aux ventes d'hier.
// ─────────────────────────────────────────────────────────────────────────────

import { useState }                              from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Target, TrendingUp, TrendingDown, Edit2, Check,
  AlertCircle, CheckCircle2, Clock, Zap, Calendar,
  ChevronRight, RotateCcw,
} from "lucide-react";
import api from "../../../services/api";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatFCFA(n: number): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("fr-FR") + " F";
}

function parseFCFA(raw: string): number {
  // Accepte "100 000 000" ou "100000000"
  return parseFloat(raw.replace(/\s/g, "").replace(",", ".")) || 0;
}

// ── Barre de progression ───────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const color  =
    pct >= 100 ? "bg-emerald-500" :
    pct >= 70  ? "bg-blue-500"    :
    pct >= 40  ? "bg-amber-400"   : "bg-red-500";

  return (
    <div className="relative w-full bg-gray-100 rounded-full h-4 overflow-hidden">
      <div
        className={`h-4 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${capped}%` }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
        {pct}%
      </span>
    </div>
  );
}

// ── Carte métrique ─────────────────────────────────────────────────────────

function MetricCard({
  icon, label, value, sub, color = "text-gray-800", bgColor = "bg-white",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bgColor?: string;
}) {
  return (
    <div className={`${bgColor} rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-1`}>
      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <p className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────

export default function ObjectivesTab() {
  const qc = useQueryClient();
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput,   setTargetInput]   = useState("");

  // ── Fetch dashboard CA ────────────────────────────────────
  const { data: dash, isLoading, refetch } = useQuery({
    queryKey:        ["ca-dashboard"],
    queryFn:         () => api.get("/sales-reports/ca-dashboard").then((r) => r.data),
    refetchInterval: 60_000,   // rafraîchit toutes les minutes
    staleTime:       30_000,
  });

  // ── Mutation : définir / modifier l'objectif CA ───────────
  const setTarget = useMutation({
    mutationFn: (targetCA: number) =>
      api.post("/sales-reports/target-ca", { targetCA }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ca-dashboard"] });
      setEditingTarget(false);
    },
  });

  const handleSaveTarget = () => {
    const val = parseFCFA(targetInput);
    if (val <= 0) return alert("Veuillez entrer un montant valide.");
    setTarget.mutate(val);
  };

  // ── Rendu ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Chargement du tableau de bord…
      </div>
    );
  }

  const noTarget = !dash || dash.targetCA === 0;

  // Couleurs selon statut
  const statutConfig = {
    ATTEINT:       { bg: "bg-emerald-50",  border: "border-emerald-200", icon: <CheckCircle2 size={18} className="text-emerald-600"/>, label: "Objectif atteint 🎉",     color: "text-emerald-700" },
    EN_AVANCE:     { bg: "bg-blue-50",     border: "border-blue-200",    icon: <TrendingUp   size={18} className="text-blue-600"/>,    label: "En avance sur l'objectif", color: "text-blue-700"    },
    EN_RETARD:     { bg: "bg-amber-50",    border: "border-amber-200",   icon: <TrendingDown size={18} className="text-amber-600"/>,   label: "En retard sur l'objectif", color: "text-amber-700"   },
    PAS_OBJECTIF:  { bg: "bg-gray-50",     border: "border-gray-200",    icon: <AlertCircle  size={18} className="text-gray-400"/>,    label: "Aucun objectif défini",    color: "text-gray-500"    },
  };

  const sc = statutConfig[dash?.statut as keyof typeof statutConfig ?? "PAS_OBJECTIF"];

  return (
    <div className="space-y-6">

      {/* ── En-tête ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target size={24} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Objectif CA Mensuel</h2>
            <p className="text-xs text-gray-400">
              Les chiffres ont un décalage de J-1 — données disponibles jusqu'au{" "}
              <span className="font-semibold text-gray-600">
                {dash
                  ? new Date(new Date().setDate(new Date().getDate() - 1))
                      .toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
                  : "…"}
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setTargetInput(dash?.targetCA ? String(dash.targetCA) : "");
            setEditingTarget(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Edit2 size={14} />
          {noTarget ? "Définir l'objectif" : "Modifier l'objectif"}
        </button>
      </div>

      {/* ── Formulaire définition objectif ──────────────────── */}
      {editingTarget && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-blue-800 mb-3">
            💰 Objectif CA du mois (en FCFA)
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ex : 100 000 000"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              className="flex-1 border border-blue-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              autoFocus
            />
            <button
              onClick={handleSaveTarget}
              disabled={setTarget.isPending}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
            >
              <Check size={14} />
              {setTarget.isPending ? "Enregistrement…" : "Valider"}
            </button>
            <button
              onClick={() => setEditingTarget(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm transition"
            >
              Annuler
            </button>
          </div>
          <p className="text-xs text-blue-500 mt-2">
            Entrez le montant sans unité, ex : <strong>100000000</strong> pour 100 millions
          </p>
        </div>
      )}

      {/* ── Bandeau statut ──────────────────────────────────── */}
      {dash && (
        <div className={`${sc.bg} border ${sc.border} rounded-2xl p-4 flex items-center gap-3`}>
          {sc.icon}
          <span className={`font-semibold text-sm ${sc.color}`}>{sc.label}</span>
          <span className="text-gray-400 text-xs ml-auto">
            Mis à jour à {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button onClick={() => refetch()} className="text-gray-400 hover:text-blue-600 transition" title="Rafraîchir">
            <RotateCcw size={14} />
          </button>
        </div>
      )}

      {noTarget ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">Aucun objectif CA défini pour ce mois</p>
          <p className="text-sm mt-1">Cliquez sur « Définir l'objectif » pour commencer le suivi.</p>
        </div>
      ) : (
        <>
          {/* ── Progression principale ──────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 font-medium">CA réalisé</p>
                <p className="text-3xl font-extrabold text-gray-900">
                  {formatFCFA(dash.caRealise)}
                </p>
              </div>
              <ChevronRight size={20} className="text-gray-300" />
              <div className="text-right">
                <p className="text-sm text-gray-500 font-medium">Objectif mensuel</p>
                <p className="text-3xl font-extrabold text-blue-600">
                  {formatFCFA(dash.targetCA)}
                </p>
              </div>
            </div>
            <ProgressBar pct={dash.progressPct ?? 0} />
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>0 F</span>
              <span className="font-semibold text-gray-600">{dash.progressPct ?? 0}% atteint</span>
              <span>{formatFCFA(dash.targetCA)}</span>
            </div>
          </div>

          {/* ── Grille métriques ────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<Target size={14} />}
              label="Reste à faire"
              value={formatFCFA(dash.caRestant)}
              sub={`sur ${dash.joursRestants} jours restants`}
              color={dash.caRestant > 0 ? "text-red-600" : "text-emerald-600"}
              bgColor={dash.caRestant > 0 ? "bg-red-50" : "bg-emerald-50"}
            />
            <MetricCard
              icon={<Zap size={14} />}
              label="Rythme nécessaire"
              value={isFinite(dash.rythmeNecessaire) ? formatFCFA(dash.rythmeNecessaire) + "/j" : "—"}
              sub="pour rattraper d'ici la fin du mois"
              color="text-orange-600"
              bgColor="bg-orange-50"
            />
            <MetricCard
              icon={<TrendingUp size={14} />}
              label="Rythme actuel"
              value={formatFCFA(dash.rythmeActuel) + "/j"}
              sub={`basé sur ${dash.jourDonnees} jours de données`}
              color="text-blue-700"
            />
            <MetricCard
              icon={<Calendar size={14} />}
              label="Projection fin de mois"
              value={formatFCFA(dash.projectionFinMois)}
              sub="si le rythme actuel est maintenu"
              color={dash.projectionFinMois >= dash.targetCA ? "text-emerald-700" : "text-amber-700"}
              bgColor={dash.projectionFinMois >= dash.targetCA ? "bg-emerald-50" : "bg-amber-50"}
            />
          </div>

          {/* ── Timeline du mois ────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-700">Avancement dans le mois</h3>
            </div>
            <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
              {/* Avancement temporel (jours écoulés) */}
              <div
                className="absolute top-0 left-0 h-full bg-gray-200 rounded-full"
                style={{ width: `${Math.round((dash.jourDonnees / dash.totalJoursMois) * 100)}%` }}
              />
              {/* Avancement CA */}
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ${
                  dash.progressPct >= 100 ? "bg-emerald-500" :
                  dash.statut === "EN_AVANCE" ? "bg-blue-500" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(dash.progressPct ?? 0, 100)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                Jour {dash.jourDonnees} / {dash.totalJoursMois}
              </span>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>1er du mois</span>
              <span>
                {dash.joursRestants > 0
                  ? `Il reste ${dash.joursRestants} jour${dash.joursRestants > 1 ? "s" : ""}`
                  : "Fin du mois"}
              </span>
              <span>
                {new Date(
                  new Date().getFullYear(),
                  new Date().getMonth() + 1,
                  0
                ).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              </span>
            </div>
          </div>

          {/* ── Alerte de retard ────────────────────────────── */}
          {dash.statut === "EN_RETARD" && isFinite(dash.rythmeNecessaire) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Accélération nécessaire</p>
                <p className="text-amber-700 text-sm mt-1">
                  Pour atteindre l'objectif de{" "}
                  <strong>{formatFCFA(dash.targetCA)}</strong>,
                  il faut réaliser en moyenne{" "}
                  <strong>{formatFCFA(dash.rythmeNecessaire)}/jour</strong> sur les{" "}
                  <strong>{dash.joursRestants} jours restants</strong>.{" "}
                  Votre rythme actuel est de{" "}
                  <strong>{formatFCFA(dash.rythmeActuel)}/jour</strong>
                  {" "}({dash.rythmeActuel < dash.rythmeNecessaire
                    ? `soit ${formatFCFA(dash.rythmeNecessaire - dash.rythmeActuel)}/jour de moins que nécessaire`
                    : "vous êtes dans les clous"}).
                </p>
              </div>
            </div>
          )}

          {/* ── Message succès ──────────────────────────────── */}
          {dash.statut === "ATTEINT" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-600" />
              <p className="font-semibold text-emerald-800 text-sm">
                🎉 Objectif mensuel atteint ! CA réalisé :{" "}
                <strong>{formatFCFA(dash.caRealise)}</strong> sur{" "}
                <strong>{formatFCFA(dash.targetCA)}</strong> visés.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
