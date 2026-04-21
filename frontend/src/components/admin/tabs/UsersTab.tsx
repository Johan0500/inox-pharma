import { useState }                              from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Plus, X, Check, Eye, EyeOff,
  LogOut, Trash2, UserPlus, Search, UserX, WifiOff
} from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useLab }  from "../../../contexts/LabContext";

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

type ConfirmAction = {
  userId: string;
  userName: string;
  type: "disconnect" | "revoke" | "delete";
} | null;

export default function UsersTab() {
  const qc              = useQueryClient();
  const { user: me }    = useAuth();
  const { selectedLab } = useLab();
  const [showModal,  setShowModal]  = useState(false);
  const [search,     setSearch]     = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [confirm,    setConfirm]    = useState<ConfirmAction>(null);
  const [form, setForm] = useState({
    email: "", password: "", firstName: "", lastName: "",
    role: "DELEGATE", labs: [] as string[], zone: "", phone: "",
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users", selectedLab],
    queryFn:  () => api.get("/users", { headers: { "X-Lab": selectedLab || "all" } }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: labsData = [] } = useQuery({
    queryKey: ["laboratories"],
    queryFn:  () => api.get("/laboratories").then(r => r.data),
    staleTime: 60000,
  });
  const LABS: string[] = (labsData as any[]).map((l: any) => l.name.toLowerCase());

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
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["users"] }); setConfirm(null); },
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["users"] }); setConfirm(null); },
  });

  const revokeAccess = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}/session`).catch(() => {});
      await api.patch(`/users/${id}/toggle`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setConfirm(null); },
  });

  const disconnectAll = useMutation({
    mutationFn: () => api.delete("/users/sessions/all"),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const resetForm = () => setForm({
    email: "", password: "", firstName: "", lastName: "",
    role: "DELEGATE", labs: [], zone: "", phone: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.firstName || !form.lastName)
      return alert("Tous les champs obligatoires doivent être remplis");
    createUser.mutate(form);
  };

  // Filtre par labo (SuperAdmin voit selon le labo sélectionné)
  const filtered = (users as any[]).filter((u: any) => {
    // Filtre recherche texte
    if (search) {
      const s = search.toLowerCase();
      const matchSearch =
        u.firstName?.toLowerCase().includes(s) ||
        u.lastName?.toLowerCase().includes(s)  ||
        u.email?.toLowerCase().includes(s)     ||
        u.role?.toLowerCase().includes(s);
      if (!matchSearch) return false;
    }
    // SuperAdmin en vue non-globale : filtre par labo sélectionné
    if (me?.role === "SUPER_ADMIN" && selectedLab && selectedLab !== "all") {
      const userLabs = [
        ...(u.adminLabs?.map((al: any) => al.laboratory?.name?.toLowerCase()) || []),
        u.delegate?.laboratory?.name?.toLowerCase(),
      ].filter(Boolean);
      return userLabs.includes(selectedLab.toLowerCase());
    }
    return true;
  });

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

  const confirmConfig = confirm ? {
    disconnect: {
      icon:    <WifiOff size={22} className="text-orange-600" />,
      bg:      "bg-orange-100",
      title:   `Déconnecter ${confirm.userName} ?`,
      desc:    "La session active sera fermée immédiatement. L'utilisateur devra se reconnecter.",
      btn:     "Déconnecter",
      btnCls:  "bg-orange-500 hover:bg-orange-600",
      action:  () => disconnectUser.mutate(confirm.userId),
      pending: disconnectUser.isPending,
    },
    revoke: {
      icon:    <UserX size={22} className="text-red-600" />,
      bg:      "bg-red-100",
      title:   `Révoquer l'accès de ${confirm.userName} ?`,
      desc:    "Le compte sera désactivé et la session fermée. L'utilisateur ne pourra plus se connecter jusqu'à réactivation.",
      btn:     "Révoquer l'accès",
      btnCls:  "bg-red-600 hover:bg-red-700",
      action:  () => revokeAccess.mutate(confirm.userId),
      pending: revokeAccess.isPending,
    },
    delete: {
      icon:    <Trash2 size={22} className="text-red-700" />,
      bg:      "bg-red-100",
      title:   `Supprimer définitivement ${confirm.userName} ?`,
      desc:    "Toutes les données de cet utilisateur seront supprimées de manière permanente. Cette action est irréversible.",
      btn:     "Supprimer définitivement",
      btnCls:  "bg-red-700 hover:bg-red-800",
      action:  () => deleteUser.mutate(confirm.userId),
      pending: deleteUser.isPending,
    },
  }[confirm.type] : null;

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
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { if (window.confirm("Déconnecter tous les utilisateurs ?")) disconnectAll.mutate(); }}
            className="flex items-center gap-2 text-sm border border-orange-200 text-orange-600 hover:bg-orange-50 px-3 py-2 rounded-xl transition"
          >
            <LogOut size={14} /> Tout déconnecter
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <UserPlus size={16} /> Nouvel utilisateur
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-3 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-xl pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
          placeholder="Rechercher un utilisateur..."
        />
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg px-3 py-1.5">
          <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded flex items-center justify-center">
            <EyeOff size={9} className="text-yellow-600" />
          </div>
          Activer / Désactiver
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg px-3 py-1.5">
          <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded flex items-center justify-center">
            <WifiOff size={9} className="text-orange-600" />
          </div>
          Déconnecter la session
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg px-3 py-1.5">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded flex items-center justify-center">
            <UserX size={9} className="text-red-600" />
          </div>
          Révoquer l'accès
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg px-3 py-1.5">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded flex items-center justify-center">
            <Trash2 size={9} className="text-red-700" />
          </div>
          Supprimer définitivement
        </div>
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
                  const hasSession = !!u.activeSessions;
                  const labs = u.adminLabs?.map((al: any) => al.laboratory?.name).filter(Boolean).join(", ");
                  const zone = u.delegate?.zone || u.delegate?.laboratory?.name || "";
                  const isSelf = u.id === me?.id;

                  return (
                    <tr key={u.id} className={`border-t hover:bg-gray-50 transition ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>

                      {/* Utilisateur */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-green-700 text-xs shrink-0 overflow-hidden border-2 border-green-100"
                            style={{ background: u.avatar ? "transparent" : "#dcfce7" }}>
                            {u.avatar
                              ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                              : <>{u.firstName?.[0]}{u.lastName?.[0]}</>
                            }
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {u.firstName} {u.lastName}
                              {isSelf && (
                                <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Moi</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Rôle */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-600"}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>

                      {/* Labo / Zone */}
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {labs ? labs.toUpperCase() : zone || "—"}
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {u.isActive ? "Actif" : "Désactivé"}
                        </span>
                      </td>

                      {/* Session */}
                      <td className="px-4 py-3 text-center">
                        {hasSession ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> En ligne
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Hors ligne</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="text-xs text-gray-300 text-center block">—</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">

                            {/* Activer / Désactiver */}
                            <button
                              onClick={() => toggleUser.mutate(u.id)}
                              title={u.isActive ? "Désactiver le compte" : "Activer le compte"}
                              className={`p-1.5 rounded-lg transition ${
                                u.isActive
                                  ? "bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200"
                                  : "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
                              }`}
                            >
                              {u.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>

                            {/* Déconnecter session */}
                            {hasSession && (
                              <button
                                onClick={() => setConfirm({ userId: u.id, userName: `${u.firstName} ${u.lastName}`, type: "disconnect" })}
                                title="Déconnecter la session active"
                                className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition border border-orange-200"
                              >
                                <WifiOff size={13} />
                              </button>
                            )}

                            {/* Révoquer accès */}
                            {u.isActive && (
                              <button
                                onClick={() => setConfirm({ userId: u.id, userName: `${u.firstName} ${u.lastName}`, type: "revoke" })}
                                title="Révoquer l'accès (désactiver + déconnecter)"
                                className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition border border-red-200"
                              >
                                <UserX size={13} />
                              </button>
                            )}

                            {/* Supprimer définitivement */}
                            {me?.role === "SUPER_ADMIN" && (
                              <button
                                onClick={() => setConfirm({ userId: u.id, userName: `${u.firstName} ${u.lastName}`, type: "delete" })}
                                title="Supprimer définitivement"
                                className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition border border-red-300"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
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

      {/* Modal confirmation */}
      {confirm && confirmConfig && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className={`w-12 h-12 ${confirmConfig.bg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
              {confirmConfig.icon}
            </div>
            <h3 className="font-bold text-gray-800 text-center mb-2">{confirmConfig.title}</h3>
            <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">{confirmConfig.desc}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Annuler
              </button>
              <button onClick={confirmConfig.action} disabled={confirmConfig.pending}
                className={`flex-1 text-white py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-60 ${confirmConfig.btnCls}`}>
                {confirmConfig.pending ? "En cours..." : confirmConfig.btn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal création utilisateur */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prénom *</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Jean" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom *</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Dupont" required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="jean.dupont@email.com" required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe *</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Min. 6 caractères" required
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rôle *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, labs: [] }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                  {availableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {(form.role === "ADMIN" || form.role === "DELEGATE") && LABS.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Laboratoire {form.role === "ADMIN" ? "(peut en avoir plusieurs)" : "*"}
                  </label>
                  <div className="flex flex-col gap-2">
                    {LABS.map(lab => (
                      <label key={lab} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                        form.labs.includes(lab) ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
                      }`}>
                        <input
                          type={form.role === "ADMIN" ? "checkbox" : "radio"}
                          name="lab"
                          checked={form.labs.includes(lab)}
                          onChange={() => {
                            if (form.role === "ADMIN") {
                              setForm(f => ({
                                ...f,
                                labs: f.labs.includes(lab) ? f.labs.filter(l => l !== lab) : [...f.labs, lab],
                              }));
                            } else {
                              setForm(f => ({ ...f, labs: [lab] }));
                            }
                          }}
                          className="accent-green-600"
                        />
                        <span className="font-semibold text-sm uppercase text-gray-700">{lab}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {form.role === "DELEGATE" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Zone / Secteur</label>
                  <input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Ex: ABOBO, COCODY..." />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Téléphone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="+225 XX XX XX XX XX" />
              </div>

              {createUser.isError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                  {(createUser.error as any)?.response?.data?.error || "Erreur lors de la création"}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  Annuler
                </button>
                <button type="submit" disabled={createUser.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {createUser.isPending ? "Création..." : <><Check size={16} /> Créer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
