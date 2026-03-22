import { useState } from "react";
import { useAuth }  from "../../contexts/AuthContext";
import api          from "../../services/api";

export default function LoginPage() {
  const { login }                   = useAuth();
  const [email,    setEmail]        = useState("");
  const [password, setPassword]     = useState("");
  const [error,    setError]        = useState("");
  const [loading,  setLoading]      = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token, res.data.user);
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === "ALREADY_CONNECTED") {
        setError(
          "⚠️ Ce compte est déjà connecté sur un autre appareil. " +
          "Déconnectez-vous d'abord de l'autre appareil puis réessayez. " +
          "Si vous ne pouvez pas, contactez votre administrateur."
        );
      } else {
        setError(err.response?.data?.error || "Erreur de connexion. Vérifiez vos identifiants.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl mb-4">
            <span className="text-4xl">🏥</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">INOX PHARMA</h1>
          <p className="text-blue-300 mt-2 text-sm">Application de Gestion Pharmaceutique</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Connexion</h2>
          <p className="text-sm text-gray-400 mb-6">Entrez vos identifiants fournis par l'administrateur</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5 text-sm leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="votre@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Connexion en cours...
                </>
              ) : "Se connecter"}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
            Les accès sont fournis exclusivement par votre administrateur.
          </p>
        </div>

        <p className="text-center text-blue-400/60 text-xs mt-6">
          INOX PHARMA © 2025 — Côte d'Ivoire
        </p>
      </div>
    </div>
  );
}