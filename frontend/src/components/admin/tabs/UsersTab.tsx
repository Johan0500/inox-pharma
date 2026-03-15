import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, ToggleLeft, ToggleRight, X } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";

const LABS = ["lic-pharma", "medisure", "sigma", "ephaco", "stallion"];
const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  ADMIN:       "bg-purple-100 text-purple-700",
  DELEGATE:    "bg-blue-100 text-blue-700",
};

export default function UsersTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", firstName: "", lastName: "",
    role: "DELEGATE", labs: ["lic-pharma"], zone: "", phone: "",
  });
  const [formError, setFormError] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn:  () => api.get("/users").then((r) => r.data),
  });

  const createUser = useMutation({
    mutationFn: (data: any) => api.post("/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setShowForm(false);
      setFormError("");
      setForm({ email: "", password: "", firstName: "", lastName: "", role: "DELEGATE", labs: ["lic-pharma"], zone: "", phone: "" });
    },
    onError: (err: any) => setFormError(err.response?.data?.error || "Erreur lors de la création"),
  });

  const toggleUser = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.email || !form.password || !form.firstName || !form.lastName)
      return setFormError("Tous les champs obligatoires doivent être remplis");
    if (form.password.length < 6)
      return setFormError("Le mot de passe doit avoir au moins 6 caractères");
    createUser.mutate(form);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Gestion des Accès</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
        >
          <UserPlus size={18} />
          Créer un accès
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Nouvel utilisateur</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
              ❌ {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Prénom"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Nom de famille"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="email@exemple.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Min. 6 caractères"
              />
            </div>
            {user?.role === "SUPER_ADMIN" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rôle *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="DELEGATE">Délégué Médical</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Laboratoire *</label>
              <select
                value={form.labs[0]}
                onChange={(e) => setForm((f) => ({ ...f, labs: [e.target.value] }))}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {LABS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {form.role === "DELEGATE" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Zone de travail</label>
                  <input
                    value={form.zone}
                    onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: YOPOUGON, BOUAKE..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="+225 07 00 00 00"
                  />
                </div>
              </>
            )}
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createUser.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition disabled:opacity-60 flex items-center gap-2"
              >
                {createUser.isPending ? "Création..." : "Créer l'accès"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium transition"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-4 py-3 text-left font-medium">Nom</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Rôle</th>
                <th className="px-4 py-3 text-left font-medium">Labo / Zone</th>
                <th className="px-4 py-3 text-center font-medium">Actif</th>
              </tr>
            </thead>
            <tbody>
              {(users as any[]).map((u, i) => (
                <tr key={u.id} className={`border-t hover:bg-gray-50 transition ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_STYLES[u.role] || "bg-gray-100 text-gray-600"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.adminLabs?.map((al: any) => al.laboratory.name).join(", ") ||
                     (u.delegate?.zone ? `${u.delegate.zone} — ${u.delegate?.laboratory?.name || ""}` : "—")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleUser.mutate(u.id)}
                      title={u.isActive ? "Désactiver" : "Activer"}
                    >
                      {u.isActive
                        ? <ToggleRight size={26} className="text-green-500 inline" />
                        : <ToggleLeft  size={26} className="text-gray-300 inline" />
                      }
                    </button>
                  </td>
                </tr>
              ))}
              {(users as any[]).length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    Aucun utilisateur — créez le premier accès
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
