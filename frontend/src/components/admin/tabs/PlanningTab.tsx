import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";
import api from "../../../services/api";

const ZONES = [
  "YOPOUGON", "MARCORY 2", "MARCORY I", "KOUMASSI", "PORTBOUET",
  "COCODY-RIVIERA-BINGER", "ADJAME ATTECOUBE WILLY", "PLATEAU",
  "TREICHVILLE", "CHU", "ABOBO-ANYAMA",
];

const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"] as const;
const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

const EMPTY_FORM = {
  delegateId: "", weekNumber: "1", zone: "YOPOUGON",
  lundi: "", mardi: "", mercredi: "", jeudi: "", vendredi: "",
  month: new Date().toISOString().slice(0, 7),
};

export default function PlanningTab() {
  const qc = useQueryClient();
  const [zone,       setZone]       = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [formError,  setFormError]  = useState("");

  // Lire les délégués pour le sélecteur
  const { data: delegates = [] } = useQuery({
    queryKey: ["delegates"],
    queryFn:  () => api.get("/delegates").then((r) => r.data),
  });

  // Lire les plannings
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["planning-admin", zone],
    queryFn:  () =>
      api.get("/planning", { params: { zone: zone || undefined } }).then((r) => r.data),
  });

  // Créer
  const createPlan = useMutation({
    mutationFn: (data: any) => api.post("/planning", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-admin"] });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setFormError("");
    },
    onError: (err: any) => setFormError(err.response?.data?.error || "Erreur"),
  });

  // Modifier
  const updatePlan = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/planning/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-admin"] });
      setEditId(null);
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setFormError("");
    },
    onError: (err: any) => setFormError(err.response?.data?.error || "Erreur"),
  });

  // Supprimer
  const deletePlan = useMutation({
    mutationFn: (id: string) => api.delete(`/planning/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planning-admin"] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.delegateId)
      return setFormError("Veuillez sélectionner un délégué");
    if (editId) {
      updatePlan.mutate({ id: editId, data: form });
    } else {
      createPlan.mutate(form);
    }
  };

  const handleEdit = (plan: any) => {
    setEditId(plan.id);
    setForm({
      delegateId: plan.delegateId,
      weekNumber: String(plan.weekNumber),
      zone:       plan.zone,
      lundi:      plan.lundi    || "",
      mardi:      plan.mardi    || "",
      mercredi:   plan.mercredi || "",
      jeudi:      plan.jeudi    || "",
      vendredi:   plan.vendredi || "",
      month:      plan.month,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    if (confirm("Supprimer ce planning ?"))
      deletePlan.mutate(id);
  };

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Planning Hebdomadaire</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...EMPTY_FORM }); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700
                     text-white px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
        >
          <Plus size={18} />
          Nouveau planning
        </button>
      </div>

      {/* ── Formulaire création / modification ─────────────── */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-800 text-lg">
              {editId ? "Modifier le planning" : "Nouveau planning"}
            </h3>
            <button onClick={() => { setShowForm(false); setEditId(null); }}
              className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
              ❌ {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Ligne 1 : Délégué + Semaine + Mois */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Délégué *
                </label>
                <select
                  value={form.delegateId}
                  onChange={(e) => setForm((f) => ({ ...f, delegateId: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm
                             focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Sélectionner --</option>
                  {(delegates as any[]).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user.firstName} {d.user.lastName} — {d.zone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Semaine *
                </label>
                <select
                  value={form.weekNumber}
                  onChange={(e) => setForm((f) => ({ ...f, weekNumber: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm
                             focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>Semaine {n}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Mois *
                </label>
                <input
                  type="month"
                  value={form.month}
                  onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm
                             focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Zone */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Zone *
              </label>
              <select
                value={form.zone}
                onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2.5 text-sm
                           focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            {/* Jours de la semaine */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {DAYS.map((day, i) => (
                <div key={day}>
                  <label className="block text-xs font-semibold text-blue-600 mb-1.5 uppercase tracking-wide">
                    {DAY_LABELS[i]}
                  </label>
                  <textarea
                    value={(form as any)[day]}
                    onChange={(e) => setForm((f) => ({ ...f, [day]: e.target.value }))}
                    rows={5}
                    className="w-full border rounded-xl px-3 py-2 text-xs
                               focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder={`Établissements\n(un par ligne)`}
                  />
                </div>
              ))}
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createPlan.isPending || updatePlan.isPending}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700
                           text-white px-6 py-2.5 rounded-xl font-medium transition
                           disabled:opacity-60 shadow-sm"
              >
                <Save size={16} />
                {createPlan.isPending || updatePlan.isPending
                  ? "Enregistrement..."
                  : editId ? "Mettre à jour" : "Créer le planning"
                }
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditId(null); setForm({ ...EMPTY_FORM }); }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700
                           px-6 py-2.5 rounded-xl font-medium transition"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filtre par zone ──────────────────────────────── */}
      <div className="flex items-center gap-3">
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="border rounded-xl px-4 py-2.5 text-sm
                     focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="">Toutes les zones</option>
          {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <span className="text-sm text-gray-400">
          {(plans as any[]).length} planning(s)
        </span>
      </div>

      {/* ── Liste des plannings ──────────────────────────── */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : (plans as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
          <p className="font-medium mb-1">Aucun planning</p>
          <p className="text-sm">Cliquez sur "Nouveau planning" pour en créer un</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(plans as any[]).map((p) => (
            <div key={p.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* En-tête du planning */}
              <div className="bg-slate-800 px-5 py-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">
                    {p.zone} — Semaine {p.weekNumber}
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {p.delegate?.user
                      ? `${p.delegate.user.firstName} ${p.delegate.user.lastName}`
                      : "Délégué non assigné"
                    } — {p.month}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(p)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                    title="Modifier"
                  >
                    <Pencil size={14} className="text-white" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition"
                    title="Supprimer"
                  >
                    <Trash2 size={14} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Tableau des jours */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-blue-50">
                      {DAY_LABELS.map((d) => (
                        <th key={d}
                          className="px-3 py-2 text-blue-700 font-semibold text-center
                                     border-r last:border-r-0"
                        >
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {DAYS.map((day) => (
                        <td key={day}
                          className="px-3 py-2 align-top border-r last:border-r-0
                                     border-t min-w-[140px]"
                        >
                          {p[day]
                            ? p[day].split("\n").filter(Boolean).map((line: string, i: number) => (
                                <div key={i}
                                  className="mb-1 bg-blue-50 rounded px-2 py-0.5 text-gray-700"
                                >
                                  {line}
                                </div>
                              ))
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}