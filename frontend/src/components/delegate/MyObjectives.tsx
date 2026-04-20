// frontend/src/components/delegate/MyObjectives.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Vue objectifs du délégué :
//   - Ses objectifs de visites/rapports/pharmacies (définis par l'admin)
//   - Le CA mensuel de son labo (lecture seule, suivi collectif)
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import {
  Target, TrendingUp, TrendingDown, CheckCircle,
  DollarSign, AlertCircle, CheckCircle2, ChevronRight,
} from "lucide-react";
import api         from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

function formatFCFA(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toLocaleString("fr-FR") + " F";
}

function ProgressBarCA({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const color  =
    pct >= 100 ? "bg-emerald-500" :
    pct >= 70  ? "bg-blue-500"    :
    pct >= 40  ? "bg-amber-400"   : "bg-red-500";
  return (
    <div className="relative w-full bg-white/20 rounded-full h-3 overflow-hidden">
      <div className={`h-3 rounded-full transition-all duration-700 ${color}`} style={{ width: `${capped}%` }} />
    </div>
  );
}

export default function MyObjectives() {
  const { user } = useAuth();
  const now      = new Date();
  const month    = `${now.getMonth() + 1}`.padStart(2, "0");
  const year     = now.getFullYear();

  // Objectifs délégué (visites, rapports, pharmacies)
  const { data: objective, isLoading: loadingObj } = useQuery({
    queryKey: ["my-objective", month, year],
    queryFn:  () => user?.delegate?.id
      ? api.get(`/objectives/${user.delegate.id}`, { params: { month, year } }).then((r) => r.data)
      : Promise.resolve(null),
    enabled: !!user?.delegate?.id,
  });

  // Rapports du mois pour calculer les réalisations
  const { data: reports = [] } = useQuery({
    queryKey: ["my-reports-obj"],
    queryFn:  () => api.get("/reports", { params: { limit: 200 } }).then((r) => r.data.reports || []),
  });

  // CA mensuel du labo (lecture seule)
  const { data: caDash } = useQuery({
    queryKey: ["ca-dashboard-delegate"],
    queryFn:  () => api.get("/sales-reports/ca-dashboard").then((r) => r.data),
    staleTime: 60_000,
  });

  const startOfMonth = new Date(year, parseInt(month) - 1, 1);
  const endOfMonth   = new Date(year, parseInt(month), 0);

  const thisMonth = (reports as any[]).filter((r) => {
    const d = new Date(r.visitDate);
    return d >= startOfMonth && d <= endOfMonth;
  });

  const achieved = {
    visits:     thisMonth.length,
    reports:    thisMonth.length,
    pharmacies: new Set(thisMonth.filter((r) => r.pharmacyId).map((r) => r.pharmacyId)).size,
  };

  const ProgressBar = ({ label, achieved: a, target: t, color }: {
    label: string; achieved: number; target: number; color: string;
  }) => {
    const pct  = t > 0 ? Math.min(Math.round((a / t) * 100), 100) : 0;
    const done = pct >= 100;
    return (
      <div className={`p-4 rounded-2xl border ${done ? "bg-green-50 border-green-200" : "bg-white border-gray-100"}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {done
              ? <CheckCircle size={16} className="text-green-600"/>
              : <Target size={16} style={{ color }}/>
            }
            <span className="font-semibold text-gray-800 text-sm">{label}</span>
          </div>
          <span className={`text-lg font-bold ${done ? "text-green-600" : ""}`} style={done ? {} : { color }}>{pct}%</span>
        </div>
        <div className="bg-gray-100 rounded-full h-3 mb-2">
          <div className="h-3 rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: done ? "#16a34a" : color }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{a} réalisé{a > 1 ? "s" : ""}</span>
          <span>Objectif : {t}</span>
        </div>
      </div>
    );
  };

  const statutConfig = {
    ATTEINT:      { icon: <CheckCircle2 size={16} className="text-emerald-400"/>, label: "Objectif atteint 🎉",       color: "text-emerald-300" },
    EN_AVANCE:    { icon: <TrendingUp   size={16} className="text-blue-300"/>,    label: "En avance sur l'objectif", color: "text-blue-300"    },
    EN_RETARD:    { icon: <TrendingDown size={16} className="text-amber-300"/>,   label: "En retard sur l'objectif", color: "text-amber-300"   },
    PAS_OBJECTIF: { icon: <AlertCircle  size={16} className="text-gray-400"/>,    label: "Pas d'objectif défini",    color: "text-gray-400"    },
  };
  const sc = statutConfig[caDash?.statut as keyof typeof statutConfig ?? "PAS_OBJECTIF"];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Mes Objectifs</h2>
        <p className="text-sm text-gray-400 capitalize">
          {now.toLocaleString("fr-FR", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ── CA du labo (carte sombre) ─────────────────────── */}
      {caDash && caDash.targetCA > 0 && (
        <div className="bg-slate-800 rounded-2xl p-5 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-blue-400"/>
              <p className="font-bold text-sm">CA Mensuel du Laboratoire</p>
            </div>
            <div className={`flex items-center gap-1 text-xs font-semibold ${sc.color}`}>
              {sc.icon} {sc.label}
            </div>
          </div>

          {/* Progression */}
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-slate-400 text-xs">Réalisé</p>
              <p className="text-xl font-extrabold text-white">{formatFCFA(caDash.caRealise)}</p>
            </div>
            <ChevronRight size={16} className="text-slate-500"/>
            <div className="text-right">
              <p className="text-slate-400 text-xs">Objectif</p>
              <p className="text-xl font-extrabold text-blue-400">{formatFCFA(caDash.targetCA)}</p>
            </div>
          </div>

          <ProgressBarCA pct={caDash.progressPct ?? 0}/>

          <div className="flex justify-between text-xs text-slate-400">
            <span>{caDash.progressPct ?? 0}% atteint</span>
            <span>Données au jour J-1</span>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-slate-700 rounded-xl p-2 text-center">
              <p className="text-xs text-slate-400">Reste</p>
              <p className="text-sm font-bold text-red-400">{formatFCFA(caDash.caRestant)}</p>
            </div>
            <div className="bg-slate-700 rounded-xl p-2 text-center">
              <p className="text-xs text-slate-400">Rythme actuel</p>
              <p className="text-sm font-bold text-blue-400">{formatFCFA(caDash.rythmeActuel)}/j</p>
            </div>
            <div className="bg-slate-700 rounded-xl p-2 text-center">
              <p className="text-xs text-slate-400">Il reste</p>
              <p className="text-sm font-bold text-white">{caDash.joursRestants} jours</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Objectifs visites / rapports / pharmacies ──────── */}
      {loadingObj ? (
        <div className="text-center py-8 text-gray-400">Chargement...</div>
      ) : !objective ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center">
          <Target size={32} className="mx-auto mb-2 text-yellow-500"/>
          <p className="font-semibold text-yellow-700">Pas encore d'objectifs terrain ce mois</p>
          <p className="text-sm text-yellow-600 mt-1">Votre administrateur n'a pas encore défini vos objectifs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {objective.targetVisits > 0 && (
            <ProgressBar label="Visites médicales"  achieved={achieved.visits}     target={objective.targetVisits}     color="#2563eb"/>
          )}
          {objective.targetReports > 0 && (
            <ProgressBar label="Rapports soumis"    achieved={achieved.reports}    target={objective.targetReports}    color="#7c3aed"/>
          )}
          {objective.targetPharmacies > 0 && (
            <ProgressBar label="Pharmacies visitées" achieved={achieved.pharmacies} target={objective.targetPharmacies} color="#16a34a"/>
          )}

          {/* Résumé */}
          <div className="bg-slate-800 rounded-2xl p-4 text-white">
            <p className="font-semibold mb-2 text-sm">Résumé terrain du mois</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-400">{achieved.visits}</p>
                <p className="text-xs text-slate-400">visites</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{achieved.pharmacies}</p>
                <p className="text-xs text-slate-400">pharmacies</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{achieved.reports}</p>
                <p className="text-xs text-slate-400">rapports</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}