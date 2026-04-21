import { useState, useRef }          from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Lock, Eye, EyeOff, CheckCircle, Camera, Pencil, X, Check } from "lucide-react";
import api          from "../../services/api";
import { useAuth }  from "../../contexts/AuthContext";

export default function MyProfile() {
  const { user, logout, updateUser } = useAuth();
  const qc = useQueryClient();

  // Mot de passe
  const [showPwd,  setShowPwd]  = useState(false);
  const [form,     setForm]     = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showNew,  setShowNew]  = useState(false);
  const [showCurr, setShowCurr] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdOk,    setPwdOk]    = useState(false);

  // Profil
  const [editName,    setEditName]    = useState(false);
  const [firstName,   setFirstName]   = useState(user?.firstName || "");
  const [lastName,    setLastName]    = useState(user?.lastName  || "");
  const [nameError,   setNameError]   = useState("");
  const [nameOk,      setNameOk]      = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Changer mot de passe ──────────────────────────────────
  const changePassword = useMutation({
    mutationFn: (data: any) => api.patch("/users/me/password", data),
    onSuccess:  () => { setPwdOk(true); setForm({ currentPassword:"", newPassword:"", confirmPassword:"" }); },
    onError:    (e: any) => setPwdError(e.response?.data?.error || "Erreur lors du changement"),
  });

  const handlePwd = (e: React.FormEvent) => {
    e.preventDefault(); setPwdError(""); setPwdOk(false);
    if (form.newPassword !== form.confirmPassword) return setPwdError("Les mots de passe ne correspondent pas");
    if (form.newPassword.length < 6) return setPwdError("Minimum 6 caractères");
    changePassword.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  // ── Mettre à jour nom ─────────────────────────────────────
  const updateProfile = useMutation({
    mutationFn: (data: any) => api.patch("/users/me/profile", data),
    onSuccess:  (res) => {
      updateUser({ firstName: res.data.firstName, lastName: res.data.lastName, avatar: res.data.avatar });
      qc.invalidateQueries({ queryKey: ["users"] });
      setNameOk(true); setEditName(false);
      setTimeout(() => setNameOk(false), 2500);
    },
    onError: (e: any) => setNameError(e.response?.data?.error || "Erreur de mise à jour"),
  });

  const handleSaveName = () => {
    setNameError("");
    if (!firstName.trim() || !lastName.trim()) return setNameError("Prénom et nom obligatoires");
    updateProfile.mutate({ firstName: firstName.trim(), lastName: lastName.trim() });
  };

  // ── Changer avatar ────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      api.patch("/users/me/profile", { avatar: base64 })
        .then((res) => {
          updateUser({ avatar: res.data.avatar });
          qc.invalidateQueries({ queryKey: ["users"] });
        })
        .catch(() => {})
        .finally(() => setAvatarLoading(false));
    };
    reader.readAsDataURL(file);
  };

  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Administrateur", ADMIN: "Administrateur", DELEGATE: "Délégué Médical",
  };

  const avatarSrc = user?.avatar;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Mon Profil</h2>

      {/* Carte profil */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

        {/* Avatar + nom */}
        <div className="flex flex-col items-center gap-3 mb-5">

          {/* Avatar cliquable */}
          <div className="relative">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-2xl overflow-hidden cursor-pointer group border-2 border-gray-100 hover:border-emerald-400 transition"
              style={{ background: avatarSrc ? "transparent" : "linear-gradient(135deg,#059669,#065f46)" }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              )}
              {/* Overlay hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-2xl">
                {avatarLoading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera size={22} className="text-white" />
                }
              </div>
            </div>
            {/* Badge caméra */}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center shadow-md transition"
            >
              <Camera size={14} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Nom éditable */}
          {editName ? (
            <div className="w-full max-w-xs space-y-2">
              <div className="flex gap-2">
                <input
                  value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                  className="flex-1 border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <input
                  value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom"
                  className="flex-1 border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              {nameError && <p className="text-xs text-red-600">{nameError}</p>}
              <div className="flex gap-2">
                <button onClick={handleSaveName} disabled={updateProfile.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-sm font-medium transition disabled:opacity-60">
                  <Check size={14} /> Sauvegarder
                </button>
                <button onClick={() => { setEditName(false); setFirstName(user?.firstName||""); setLastName(user?.lastName||""); setNameError(""); }}
                  className="flex items-center justify-center gap-1.5 border border-gray-200 text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition">
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <h3 className="font-bold text-gray-800 text-lg">{user?.firstName} {user?.lastName}</h3>
                <button onClick={() => { setEditName(true); setFirstName(user?.firstName||""); setLastName(user?.lastName||""); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-emerald-600 transition">
                  <Pencil size={14} />
                </button>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                {ROLE_LABELS[user?.role || "DELEGATE"]}
              </span>
              {nameOk && (
                <p className="text-xs text-emerald-600 flex items-center justify-center gap-1 mt-1">
                  <CheckCircle size={12} /> Profil mis à jour
                </p>
              )}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="space-y-3 border-t border-gray-50 pt-4">
          {[
            { label: "Email",       value: user?.email },
            { label: "Zone",        value: (user as any)?.delegate?.zone || "—" },
            { label: "Laboratoire", value: ((user as any)?.labs?.[0] || "—").toUpperCase() },
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
          onClick={() => { setShowPwd(!showPwd); setPwdError(""); setPwdOk(false); }}
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
            {pwdOk && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 my-3 text-green-700 text-sm">
                <CheckCircle size={16} /> Mot de passe changé avec succès !
              </div>
            )}
            {pwdError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 my-3 text-sm">❌ {pwdError}</div>
            )}
            <form onSubmit={handlePwd} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe actuel</label>
                <div className="relative">
                  <input type={showCurr ? "text" : "password"} value={form.currentPassword}
                    onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                    className="w-full border rounded-xl px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Votre mot de passe actuel" required />
                  <button type="button" onClick={() => setShowCurr(!showCurr)} className="absolute right-3 top-2.5 text-gray-400">
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
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-2.5 text-gray-400">
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
