import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Save, Loader, CheckCircle } from "lucide-react";
import axios from "axios";
import api from "../../services/api";

const SPECIALTIES = [
  "MEDECIN GENERALE", "CHIRURGIE", "NEPHROLOGIE",
  "GYNECO-SAGE FEMME", "DERMATOLOGIE", "DIABETOLOGIE",
  "PEDIATRIE", "KINESIE", "PNEUMOLOGIE",
  "ORL", "RHUMATOLOGIE NEURO TRAUMATO", "OPHTALMOLOGIE",
];

const PRODUCTS_BY_SPECIALTY: Record<string, string[]> = {
  "CHIRURGIE":    ["CROCIP-TZ","ACICROF-P","PIRRO","ROLIK","FEROXYDE","HEAMOCARE","CYPRONURAN"],
  "NEPHROLOGIE":  ["AZIENT","CROCIP-TZ","CROZOLE"],
  "GYNECO-SAGE FEMME": ["AZIENT","BETAMECRO","HEAMOCARE","MRITIZ","CROZOLE"],
  "DERMATOLOGIE": ["AZIENT","BETAMECRO","BECLOZOLE","KEOZOL","HEAMOCARE","MRITIZ","CROZOLE"],
  "DIABETOLOGIE": ["GLIZAR MR","CROFORMIN","PREGIB","HEAMOCARE","CROCIP-TZ","CROZOLE"],
  "PEDIATRIE":    ["CEXIME","CROCILLINE","CROZOLE","GUAMEN","ROLIK","FEROXYDE","TERCO","CYPRONURAN"],
  "KINESIE":      ["CROLINI GEL","BETAMECRO","PIRRO","ACICROF-P","CETAFF","COFEN","DOLBUFEN","ROLIK"],
  "PNEUMOLOGIE":  ["CEXIME","GUAMEN","AZIENT","MRITIZ","BETAMECRO","CROCIP TZ"],
  "ORL":          ["CEXIME","AZIENT","GUAMEN","MRITIZ","BETAMECRO","COFEN","CROCILLINE","DOLBUFEN"],
  "RHUMATOLOGIE NEURO TRAUMATO": ["PIRRO","ACICROF-P","PREGIB","ESOMECRO","BETAMECRO","CROLINI GEL"],
  "OPHTALMOLOGIE":["CROGENTA","MRITIZ","BETAMECRO","AZIENT","CROCIP-TZ"],
};

export default function VisitReport() {
  const { register, handleSubmit, watch, reset } = useForm();
  const [aiSummary,     setAiSummary]     = useState("");
  const [loadingAI,     setLoadingAI]     = useState(false);
  const [selectedProds, setSelectedProds] = useState<string[]>([]);
  const [success,       setSuccess]       = useState(false);

  const specialty = watch("specialty");
  const notes     = watch("notes");
  const suggestedProducts = PRODUCTS_BY_SPECIALTY[specialty] || [];

  // Résumé Gemini AI
  const summarizeWithGemini = async () => {
    if (!notes?.trim()) return;
    setLoadingAI(true);
    try {
      const key = import.meta.env.VITE_GEMINI_KEY;
      if (!key || key === "votre_clé_gemini_ici") {
        setAiSummary("⚠️ Clé Gemini non configurée dans frontend/.env (VITE_GEMINI_KEY)");
        return;
      }
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          contents: [{
            parts: [{
              text:
                `Tu es l'assistant d'un délégué médical d'INOX PHARMA en Côte d'Ivoire.\n` +
                `Résume ce rapport de visite médicale en 3-4 phrases claires et professionnelles en français.\n\n` +
                `Rapport : ${notes}`,
            }],
          }],
        }
      );
      setAiSummary(res.data.candidates[0].content.parts[0].text);
    } catch (err: any) {
      setAiSummary("Erreur Gemini : " + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoadingAI(false);
    }
  };

  // Enregistrer le rapport
  const submitReport = useMutation({
    mutationFn: (data: any) =>
      api.post("/reports", {
        ...data,
        productsShown: selectedProds.join(", "),
        aiSummary:     aiSummary || null,
      }),
    onSuccess: () => {
      setSuccess(true);
      reset();
      setAiSummary("");
      setSelectedProds([]);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: any) => alert("❌ " + (err.response?.data?.error || "Erreur lors de l'enregistrement")),
  });

  const toggleProduct = (p: string) =>
    setSelectedProds((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  return (
    <form
      onSubmit={handleSubmit((d) => submitReport.mutate(d))}
      className="space-y-4 pb-4"
    >
      <h2 className="text-xl font-bold text-gray-800">Rapport de Visite</h2>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-green-700">
          <CheckCircle size={20} />
          <p className="font-medium">Rapport enregistré avec succès !</p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">

        {/* Médecin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Médecin visité *
          </label>
          <input
            {...register("doctorName", { required: true })}
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Dr. Nom Prénom"
          />
        </div>

        {/* Spécialité */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Spécialité médicale
          </label>
          <select
            {...register("specialty")}
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">-- Sélectionner une spécialité --</option>
            {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Produits suggérés */}
        {suggestedProducts.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Produits à présenter — {specialty}
              <span className="text-xs text-gray-400 ml-2">
                ({selectedProds.length} sélectionné(s))
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedProducts.map((prod) => (
                <button
                  type="button"
                  key={prod}
                  onClick={() => toggleProduct(prod)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 transition font-semibold
                    ${selectedProds.includes(prod)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                >
                  {prod}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Notes de visite *
          </label>
          <textarea
            {...register("notes", { required: true })}
            rows={6}
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="Décrivez la visite : retours du médecin, produits discutés, objections, prochaines actions..."
          />
        </div>

        {/* Bouton Gemini */}
        <button
          type="button"
          onClick={summarizeWithGemini}
          disabled={loadingAI || !notes?.trim()}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700
                     border border-purple-200 rounded-xl hover:bg-purple-100 transition
                     text-sm font-medium w-full justify-center disabled:opacity-50"
        >
          {loadingAI
            ? <><Loader size={15} className="animate-spin" /> Génération en cours...</>
            : <><Sparkles size={15} /> Résumer avec Gemini AI</>
          }
        </button>

        {/* Résumé IA */}
        {aiSummary && (
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="text-xs font-bold text-purple-600 mb-2 flex items-center gap-1">
              <Sparkles size={12} /> Résumé IA (Gemini)
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{aiSummary}</p>
          </div>
        )}
      </div>

      {/* Enregistrer */}
      <button
        type="submit"
        disabled={submitReport.isPending}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white
                   rounded-2xl font-bold text-base flex items-center justify-center gap-2
                   transition disabled:opacity-60 shadow-lg"
      >
        <Save size={18} />
        {submitReport.isPending ? "Enregistrement..." : "Enregistrer le rapport"}
      </button>
    </form>
  );
}
