import { useState }                              from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Plus, X, Check, Eye, EyeOff,
  LogOut, Trash2, Shield, UserPlus, Search
} from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN:       "Administrateur",
  DELEGATE:    "Délégué",
};
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  ADMIN:       "bg-purple-100 text-purple-700",
  DELEGATE:    "bg-blue-100 text-blue-700",
};

const LABS = ["lic-pharma", "croient"];

export default function UsersTab() {
  const qc           = useQueryClient();
  const { user: me } = useAuth();
  const [showModal,  setShowModal]  = useState(false);
  const [search,     setSearch]     = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "", password: "", firstName: "", lastName: "",
    role: "DELEGATE", labs: [] as string[], zone: "", phone: "",
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn:  () => api.get("/users").then(r => r.data),
    refetchInterval: 30000,
  });

  const createUser = useMutation({
    mutationFn: (data: any) => api.post("/users", data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["users"] }); setShowModal(false); resetForm(); },
  });

  const toggleUser = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/toggle`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const disconnectUser = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}/session`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["users"] }); setConfirmDel(null); },
  });

  const disconnectAll = useMutation({
    mutationFn: () => api.delete("/users/sessions/all"),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const resetForm = () => setForm({
    email:"", password:"", firstName:"", lastName:"",
    role:"DELEGATE", labs:[], zone:"", phone:"",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.firstName || !form.lastName)
      return alert("Tous les champs obligatoires doivent être remplis");
    createUser.mutate(form);
  };

  const filtered = (users as any[]).filter((u: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(s) ||
      u.lastName?.toLowerCase().includes(s)  ||
      u.email?.toLowerCase().includes(s)     ||
      u.role?.toLowerCase().includes(s)
    );
  });

  // Rôles disponibles selon le rôle de l'utilisateur connecté
  const availableRoles = me?.role === "SUPER_ADMIN"
    ? [
        { value: "SUPER_ADMIN", label: "Super Administrateur" },
        { value: "ADMIN",       label: "Administrateur"        },
        { value: "DELEGATE",    label: "Délégué"               },
      ]
    : [
        { value: "ADMIN",    label: "Administrateur" },
        { value: "DELEGATE", label: "Délégué"        },
      ];

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users size={22} className="text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Utilisateurs</h2>
            <p className="text-sm text-gray-400">{(users as any[]).length} compte(s)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { if (window.confirm("Déconnecter tous ?")) disconnectAll.mutate(); }}
            className="flex items-center gap-2 text-sm border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition">
            <LogOut size={14} /> Tout déconnecter
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm">
            <UserPlus size={16} /> Nouvel utilisateur
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-3 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-xl pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
          placeholder="Rechercher un utilisateur..." />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Chargement...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white text-left">
                  <th className="px-4 py-3 font-medium">Utilisateur</th>
                  <th className="px-4 py-3 font-medium">Rôle</th>
                  <th className="px-4 py-3 font-medium">Labo / Zone</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-center">Session</th>
                  <th className="px-4 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any, i: number) => {
                  const hasSession = u.activeSessions?.length > 0;
                  const labs = u.adminLabs?.map((al: any) => al.laboratory?.name).filter(Boolean).join(", ");
                  const zone = u.delegate?.zone || u.delegate?.laboratory?.name || "";
                  const isSelf = u.id === me?.id;

                  return (
                    <tr key={u.id} className={`border-t hover:bg-gray-50 transition ${i%2===1?"bg-gray-50/40":""}`}>
                      {/* Utilisateur */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar
                            ? <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                            : <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700 text-xs">
                                {u.firstName?.[0]}{u.lastName?.[0]}
                              </div>
                          }
                          <div>
                            <p className="font-semibold text-gray-800">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Rôle */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_COLORS[u.role]||"bg-gray-100 text-gray-600"}`}>
                          {ROLE_LABELS[u.role]||u.role}
                        </span>
                      </td>

                      {/* Labo / Zone */}
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {labs ? labs.toUpperCase() : zone || "—"}
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.isActive?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>
                          {u.isActive ? "Actif" : "Désactivé"}
                        </span>
                      </td>

                      {/* Session */}
                      <td className="px-4 py-3 text-center">
                        {hasSession
                          ? <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> En ligne
                            </span>
                          : <span className="text-xs text-gray-400">Hors ligne</span>
                        }
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Activer/désactiver */}
                          {!isSelf && (
                            <button
                              onClick={() => toggleUser.mutate(u.id)}
                              title={u.isActive ? "Désactiver" : "Activer"}
                              className={`p-1.5 rounded-lg transition text-xs ${u.isActive
                                ? "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                                : "bg-green-50 text-green-600 hover:bg-green-100"}`}
                            >
                              {u.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          )}

                          {/* Déconnecter session */}
                          {hasSession && !isSelf && (
                            <button
                              onClick={() => { if (window.confirm(`Déconnecter ${u.firstName} ?`)) disconnectUser.mutate(u.id); }}
                              title="Déconnecter à distance"
                              className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition"
                            >
                              <LogOut size={13} />
                            </button>
                          )}

                          {/* Supprimer accès (désactiver + déconnecter) */}
                          {!isSelf && (
                            <button
                              onClick={() => setConfirmDel(u.id)}
                              title="Supprimer les accès"
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <Users size={32} className="mx-auto mb-2 text-gray-200" />
                Aucun utilisateur trouvé
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal confirmation suppression */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmDel(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-center mb-2">Supprimer les accès ?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              L'utilisateur sera désactivé et déconnecté immédiatement. Il ne pourra plus se connecter.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Annuler
              </button>
              <button
                onClick={async () => {
                  await disconnectUser.mutateAsync(confirmDel);
                  await toggleUser.mutateAsync(confirmDel);
                  setConfirmDel(null);
                }}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition">
                Supprimer les accès
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <UserPlus size={18} className="text-green-600" />
                Nouvel utilisateur
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Prénom + Nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prénom *</label>
                  <input value={form.firstName} onChange={e => setForm(f=>({...f,firstName:e.target.value}))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Jean" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom *</label>
                  <input value={form.lastName} onChange={e => setForm(f=>({...f,lastName:e.target.value}))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Dupont" required />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="jean.dupont@email.com" required />
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe *</label>
                <div className="relative">
                  <input type={showPwd?"text":"password"} value={form.password}
                    onChange={e => setForm(f=>({...f,password:e.target.value}))}
                    className="w-full border rounded-xl px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Min. 6 caractères" required />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rôle *</label>
                <select value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value,labs:[]}))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                  {availableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Laboratoire(s) — SEULEMENT lic-pharma et croient */}
              {(form.role === "ADMIN" || form.role === "DELEGATE") && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Laboratoire {form.role === "ADMIN" ? "(peut en avoir plusieurs)" : "*"}
                  </label>
                  <div className="flex flex-col gap-2">
                    {LABS.map(lab => (
                      <label key={lab} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition
                        ${form.labs.includes(lab)
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"}`}>
                        <input type={form.role==="ADMIN"?"checkbox":"radio"}
                          name="lab"
                          checked={form.labs.includes(lab)}
                          onChange={() => {
                            if (form.role === "ADMIN") {
                              setForm(f => ({
                                ...f,
                                labs: f.labs.includes(lab)
                                  ? f.labs.filter(l=>l!==lab)
                                  : [...f.labs, lab]
                              }));
                            } else {
                              setForm(f => ({ ...f, labs: [lab] }));
                            }
                          }}
                          className="accent-green-600" />
                        <span className="font-semibold text-sm" style={{
                          color: lab==="lic-pharma"?"#065f46":"#1e40af"
                        }}>
                          {lab === "lic-pharma" ? "LIC PHARMA" : "CROIENT"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Zone (délégué) */}
              {form.role === "DELEGATE" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Zone / Secteur</label>
                  <input value={form.zone} onChange={e => setForm(f=>({...f,zone:e.target.value}))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Ex: ABOBO, COCODY..." />
                </div>
              )}

              {/* Téléphone */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Téléphone</label>
                <input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="+225 XX XX XX XX XX" />
              </div>

              {/* Erreur */}
              {createUser.isError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                  ❌ {(createUser.error as any)?.response?.data?.error || "Erreur lors de la création"}
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  Annuler
                </button>
                <button type="submit" disabled={createUser.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {createUser.isPending
                    ? "Création..."
                    : <><Check size={16} /> Créer l'utilisateur</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
