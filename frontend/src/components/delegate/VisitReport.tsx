import { useState }    from "react";
import { useMutation } from "@tanstack/react-query";
import { FileText, Wifi, WifiOff, CheckCircle, Sparkles } from "lucide-react";
import api             from "../../services/api";
import { useAuth }     from "../../contexts/AuthContext";
import { isOnline, saveReportOffline } from "../../services/offlineSync";
import { useQuery }    from "@tanstack/react-query";

export default function VisitReport() {
  const { user }   = useAuth();
  const [form, setForm] = useState({
    doctorName:    "",
    specialty:     "",
    pharmacyId:    "",
    productsShown: "",
    notes:         "",
  });
  const [aiSummary,  setAiSummary]  = useState("");
  const [generating, setGenerating] = useState(false);
  const [success,    setSuccess]    = useState<"online" | "offline" | null>(null);
  const [error,      setError]      = useState("");

  const { data: pharmaciesData } = useQuery({
    queryKey: ["pharmacies-report"],
    queryFn:  () => api.get("/pharmacies", { params: { limit: 500 } }).then((r) => r.data),
  });
  const pharmacies = pharmaciesData?.pharmacies || pharmaciesData || [];

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn:  () => api.get("/products").then((r) => r.data),
  });

  const generateAI = async () => {
    if (!form.notes || form.notes.length < 20) {
      setError("Ajoutez plus de détails dans les notes pour générer un résumé IA");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_KEY}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Tu es un assistant pharmaceutique. Génère un résumé professionnel et concis (3-4 phrases) de cette visite médicale en français :
                  Médecin: ${form.doctorName}
                  Spécialité: ${form.specialty || "Non précisé"}
                  Produits présentés: ${form.productsShown || "Non précisé"}
                  Notes: ${form.notes}
                  Le résumé doit être professionnel, objectif et mettre en valeur les points clés de la visite.`
              }]
            }]
          }),
        }
      );
      const data = await response.json();
      setAiSummary(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
    } catch {
      setError("Erreur lors de la génération IA");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(null);

    if (!form.doctorName || !form.notes) {
      setError("Médecin et notes sont obligatoires");
      return;
    }

    const reportData = { ...form, aiSummary };

    if (!isOnline()) {
      // Sauvegarder hors ligne
      await saveReportOffline(reportData);
      setSuccess("offline");
      setForm({ doctorName:"", specialty:"", pharmacyId:"", productsShown:"", notes:"" });
      setAiSummary("");
      return;
    }

    try {
      await api.post("/reports", reportData);
      setSuccess("online");
      setForm({ doctorName:"", specialty:"", pharmacyId:"", productsShown:"", notes:"" });
      setAiSummary("");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      // Si erreur réseau → sauvegarder hors ligne
      if (!navigator.onLine) {
        await saveReportOffline(reportData);
        setSuccess("offline");
      } else {
        setError(err.response?.data?.error || "Erreur lors de la soumission");
      }
    }
  };

  const SPECIALITES = ["Médecine générale","Pédiatrie","Gynécologie","Cardiologie","Dermatologie","Diabétologie","Rhumatologie","Chirurgie","Ophtalmologie","Neurologie","Néphologie","Kinésithérapie"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Rapport de Visite</h2>
        <div className="flex items-center gap-1 text-xs">
          {isOnline()
            ? <><Wifi    size={12} className="text-green-500"/><span className="text-green-600">En ligne</span></>
            : <><WifiOff size={12} className="text-red-500" /><span className="text-red-600">Hors ligne</span></>
          }
        </div>
      </div>

      {success === "online" && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-2 text-green-700">
          <CheckCircle size={18} />
          <span className="font-medium">Rapport soumis avec succès !</span>
        </div>
      )}

      {success === "offline" && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-orange-700">
          <div className="flex items-center gap-2 font-medium mb-1">
            <WifiOff size={16} />
            Rapport sauvegardé hors ligne
          </div>
          <p className="text-xs">Il sera automatiquement envoyé dès que vous serez connecté à internet.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">❌ {error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Médecin visité *</label>
            <input value={form.doctorName} onChange={(e) => setForm((f) => ({ ...f, doctorName: e.target.value }))}
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Dr. Nom Prénom" required />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Spécialité</label>
            <select value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Sélectionner une spécialité</option>
              {SPECIALITES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pharmacie</label>
            <select value={form.pharmacyId} onChange={(e) => setForm((f) => ({ ...f, pharmacyId: e.target.value }))}
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Sélectionner une pharmacie (optionnel)</option>
              {(pharmacies as any[]).slice(0, 200).map((p: any) => (
                <option key={p.id} value={p.id}>{p.nom}{p.ville ? ` — ${p.ville}` : ""}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Produits présentés</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(products as any[]).filter((p: any) => p.isActive).map((p: any) => (
                <button key={p.id} type="button"
                  onClick={() => {
                    const current = form.productsShown ? form.productsShown.split(",").map((s) => s.trim()) : [];
                    const idx     = current.indexOf(p.name);
                    if (idx === -1) {
                      setForm((f) => ({ ...f, productsShown: [...current, p.name].join(", ") }));
                    } else {
                      current.splice(idx, 1);
                      setForm((f) => ({ ...f, productsShown: current.join(", ") }));
                    }
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition
                    ${form.productsShown?.includes(p.name)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes de visite *</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={5} placeholder="Décrivez le déroulement de la visite, les sujets abordés, les retours du médecin..." required />
          </div>

          {/* Résumé IA */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600">Résumé IA (Gemini)</label>
              <button type="button" onClick={generateAI} disabled={generating || !form.notes}
                className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-60">
                <Sparkles size={12} />
                {generating ? "Génération..." : "Générer"}
              </button>
            </div>
            {aiSummary && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-sm text-purple-800 leading-relaxed">
                {aiSummary}
              </div>
            )}
          </div>
        </div>

        <button type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl transition shadow-lg active:scale-95 flex items-center justify-center gap-2">
          <FileText size={18} />
          {isOnline() ? "Soumettre le rapport" : "Sauvegarder hors ligne"}
        </button>
      </form>
    </div>
  );
}