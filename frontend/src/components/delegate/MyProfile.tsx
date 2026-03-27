import { useState }      from "react";
import { useMutation }   from "@tanstack/react-query";
import { User, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import api               from "../../services/api";
import { useAuth }       from "../../contexts/AuthContext";

export default function MyProfile() {
  const { user, logout } = useAuth();
  const [showPwd,  setShowPwd]  = useState(false);
  const [form,     setForm]     = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showNew,  setShowNew]  = useState(false);
  const [showCurr, setShowCurr] = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  const changePassword = useMutation({
    mutationFn: (data: any) => api.patch("/users/me/password", data),
    onSuccess:  () => { setSuccess(true); setForm({ currentPassword:"", newPassword:"", confirmPassword:"" }); },
    onError:    (err: any) => setError(err.response?.data?.error || "Erreur lors du changement"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (form.newPassword !== form.confirmPassword) return setError("Les mots de passe ne correspondent pas");
    if (form.newPassword.length < 6) return setError("Minimum 6 caractères");
    changePassword.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Administrateur", ADMIN: "Administrateur", DELEGATE: "Délégué Médical",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Mon Profil</h2>

      {/* Infos personnelles */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center">
            <span className="text-white text-2xl font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">{user?.firstName} {user?.lastName}</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
              {ROLE_LABELS[user?.role || "DELEGATE"]}
            </span>
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-50 pt-4">
          {[
            { label: "Email",       value: user?.email },
            { label: "Zone",        value: user?.delegate?.zone || "—" },
            { label: "Laboratoire", value: (user?.labs?.[0] || "—").toUpperCase() },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-400">{label}</span>
              <span className="font-medium text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Changer mot de passe */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => { setShowPwd(!showPwd); setError(""); setSuccess(false); }}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-blue-600" />
            <span className="font-semibold text-gray-800 text-sm">Changer le mot de passe</span>
          </div>
          <span className="text-gray-400 text-xs">{showPwd ? "Fermer" : "Modifier"}</span>
        </button>

        {showPwd && (
          <div className="px-5 pb-5 border-t border-gray-50">
            {success && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 my-3 text-green-700 text-sm">
                <CheckCircle size={16} />
                Mot de passe changé avec succès !
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 my-3 text-sm">❌ {error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe actuel</label>
                <div className="relative">
                  <input type={showCurr ? "text" : "password"} value={form.currentPassword}
                    onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                    className="w-full border rounded-xl px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Votre mot de passe actuel" required />
                  <button type="button" onClick={() => setShowCurr(!showCurr)}
                    className="absolute right-3 top-2.5 text-gray-400">
                    {showCurr ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nouveau mot de passe</label>
                <div className="relative">
                  <input type={showNew ? "text" : "password"} value={form.newPassword}
                    onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                    className="w-full border rounded-xl px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Min. 6 caractères" required />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-2.5 text-gray-400">
                    {showNew ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirmer</label>
                <input type="password" value={form.confirmPassword}
                  onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Répétez le nouveau mot de passe" required />
              </div>
              <button type="submit" disabled={changePassword.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium transition disabled:opacity-60 text-sm">
                {changePassword.isPending ? "Changement..." : "Changer le mot de passe"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Déconnexion */}
      <button onClick={logout}
        className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-2xl transition text-sm border border-red-100">
        Se déconnecter
      </button>
    </div>
  );
}