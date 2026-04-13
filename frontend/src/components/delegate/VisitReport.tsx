import { useState, useMemo } from "react";
import { useQuery }          from "@tanstack/react-query";
import { FileText, Wifi, WifiOff, CheckCircle, Sparkles, Search, X } from "lucide-react";
import api          from "../../services/api";
import { useAuth }  from "../../contexts/AuthContext";
import { isOnline, saveReportOffline } from "../../services/offlineSync";

// ── Produits par spécialité (mis à jour) ─────────────────────
const PRODUCTS_BY_SPECIALTY: Record<string, string[]> = {
  "MEDECIN GENERALE": [
    "TERCO","CEXIME","FEROXYDE","GUAMEN","DOLBUFEN","CETAFF","COFEN",
    "HEAMOCARE","ROLIK","CYPRONURAN","ANOCURE","TRAVICOLD","DINATE",
    "INOBACTAME","DINATE INJECTIABLE","FEROXYDE B9","INOBACTAM INJ",
  ],
  "CHIRURGIE": [
    "CROCIP-TZ","ACICROF-P","PIRRO","HEAMOCARE","CYPRONURAN",
    "BETAMECRO","INABACTAME","ROLIK","FEROXYDE","ESOMECRO","AZIENT",
  ],
  "NEPHROLOGIE": ["AZIENT","CROCIP-TZ","CROZOLE"],
  "GASTRO":      ["ESOMECRO","AZIENT","CROZOLE","TRAVICOLD"],
  "GYNECO-SAGE FEMME": [
    "AZIENT","CEXIME","ZIFLUSEC","ZIFLUSEC KIT","CROTRIMA V6",
    "FEROXYDE B9","CROGENTA","HEAMOCARE","CYPRONURAN","ROLIK",
    "GESTREL","CROZOLE CP","FEROXYDE","KEOZOL",
  ],
  "DERMATOLOGIE": [
    "AZIENT","BETAMECRO","BECLOZOLE","KEOZOL","HEAMOCARE","MRITIZ","CROZOLE",
  ],
  "DERMATOLOGIE VENEROLOGIE": [
    "AZIENT","BETAMECRO","BECLOZOLE","KEOZOL","HEAMOCARE","MRITIZ",
    "CROZOLE","INOBACTAME","SANOZOL","CROTRIMA V6","CROCILLINE",
  ],
  "DIABETOLOGIE": [
    "GLIZAR MR","CROFORMIN","PREGIB","HEAMOCARE","CROCIP-TZ","CROZOLE","ESOMECRO","MRITIZ",
  ],
  "PEDIATRIE": [
    "CEXIME","CROCILLINE","CROZOLE","GUAMEN","ROLIK","FEROXYDE",
    "TERCO","CYPRONURAN","TRAVICOLD","ANOCURE","DINATE","KEOZOL","MRITIZ",
  ],
  "KINESIE": [
    "CROLINI GEL","BETAMECRO","PIRRO","ACICROF-P","CETAFF",
    "COFEN","DOLBUFEN","ROLIK","ESOMECRO","KEOZOL",
  ],
  "PNEUMOLOGIE": [
    "CEXIME","GUAMEN","AZIENT","MRITIZ","BETAMECRO","CROCIP TZ",
    "COFEN / ACICROF P","INOBACTAM","CROCILLINE","TRAVICOLD","CROZOLE","DOLBUFEN",
  ],
  "ORL": [
    "CEXIME","AZIENT","GUAMEN","MRITIZ","BETAMECRO","COFEN",
    "CROCILLINE","CYPRONURAN","DOLBUFEN","CETAFF","TRAVICOLD","DOBUFEN",
  ],
  "RHUMATOLOGIE NEURO TRAUMATO": [
    "PIRRO","ACICROF-P","PREGIB","ESOMECRO","BETAMECRO","CROLINI GEL","CROCIP TZ","INOBACTAM",
  ],
  "OPHTALMOLOGIE": ["CROGENTA","MRITIZ","BETAMECRO","AZIENT","CROCIP-TZ"],
};

const ALL_SPECIALTIES = Object.keys(PRODUCTS_BY_SPECIALTY);

export default function VisitReport() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    doctorName:    "",
    specialty:     "",
    pharmacyId:    "",
    productsShown: "",
    notes:         "",
  });
  const [aiSummary,    setAiSummary]    = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [success,      setSuccess]      = useState<"online" | "offline" | null>(null);
  const [error,        setError]        = useState("");
  const [pharmSearch,  setPharmSearch]  = useState("");
  const [showPharmList, setShowPharmList] = useState(false);

  // ── Pharmacies ─────────────────────────────────────────────
  const { data: pharmaciesData } = useQuery({
    queryKey: ["pharmacies-report"],
    queryFn:  () => api.get("/pharmacies", { params: { limit: 1000 } }).then(r => r.data),
  });
  const allPharmacies: any[] = pharmaciesData?.pharmacies || pharmaciesData || [];

  // Filtre pharmacies par recherche
  const filteredPharmacies = useMemo(() => {
    if (!pharmSearch.trim()) return allPharmacies.slice(0, 30);
    const q = pharmSearch.toLowerCase();
    return allPharmacies
      .filter(p => p.nom?.toLowerCase().includes(q) || p.ville?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [allPharmacies, pharmSearch]);

  const selectedPharmacy = allPharmacies.find(p => p.id === form.pharmacyId);

  // ── Produits selon spécialité choisie ─────────────────────
  const availableProducts: string[] = form.specialty
    ? (PRODUCTS_BY_SPECIALTY[form.specialty] || [])
    : Object.values(PRODUCTS_BY_SPECIALTY).flat().filter((v, i, a) => a.indexOf(v) === i);

  const selectedProducts = form.productsShown
    ? form.productsShown.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const toggleProduct = (name: string) => {
    const idx = selectedProducts.indexOf(name);
    if (idx === -1) {
      setForm(f => ({ ...f, productsShown: [...selectedProducts, name].join(", ") }));
    } else {
      const next = [...selectedProducts];
      next.splice(idx, 1);
      setForm(f => ({ ...f, productsShown: next.join(", ") }));
    }
  };

  // ── IA Gemini ──────────────────────────────────────────────
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
          method: "POST",
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

  // ── Soumission ─────────────────────────────────────────────
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
      await saveReportOffline(reportData);
      setSuccess("offline");
      resetForm();
      return;
    }

    try {
      await api.post("/reports", reportData);
      setSuccess("online");
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (!navigator.onLine) {
        await saveReportOffline(reportData);
        setSuccess("offline");
      } else {
        setError(err.response?.data?.error || "Erreur lors de la soumission");
      }
    }
  };

  const resetForm = () => {
    setForm({ doctorName:"", specialty:"", pharmacyId:"", productsShown:"", notes:"" });
    setAiSummary("");
    setPharmSearch("");
  };

  const inp = {
    width: "100%", border: "1px solid #e5e7eb", borderRadius: 12,
    padding: "10px 14px", fontSize: 14, outline: "none",
    boxSizing: "border-box" as const, background: "white",
  };
  const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280",
    marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#064e3b", fontFamily: "Georgia, serif" }}>
          Rapport de Visite
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          {isOnline()
            ? <><Wifi size={13} color="#22c55e" /><span style={{ color: "#16a34a" }}>En ligne</span></>
            : <><WifiOff size={13} color="#ef4444" /><span style={{ color: "#dc2626" }}>Hors ligne</span></>
          }
        </div>
      </div>

      {/* Alertes */}
      {success === "online" && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14,
          padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, color: "#166534" }}>
          <CheckCircle size={18} />
          <span style={{ fontWeight: 600 }}>Rapport soumis avec succès !</span>
        </div>
      )}
      {success === "offline" && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14,
          padding: "14px 18px", color: "#9a3412" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, marginBottom: 4 }}>
            <WifiOff size={15} /> Rapport sauvegardé hors ligne
          </div>
          <p style={{ margin: 0, fontSize: 12 }}>
            Il sera automatiquement envoyé dès que vous serez connecté à internet.
          </p>
        </div>
      )}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 14,
          padding: "12px 16px", color: "#dc2626", fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb",
          padding: 20, display: "flex", flexDirection: "column", gap: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

          {/* Médecin */}
          <div>
            <label style={lbl}>Médecin visité *</label>
            <input style={inp} value={form.doctorName}
              onChange={e => setForm(f => ({ ...f, doctorName: e.target.value }))}
              placeholder="Dr. Nom Prénom" required />
          </div>

          {/* Spécialité */}
          <div>
            <label style={lbl}>Spécialité</label>
            <select style={inp} value={form.specialty}
              onChange={e => {
                setForm(f => ({ ...f, specialty: e.target.value, productsShown: "" }));
              }}>
              <option value="">Toutes les spécialités</option>
              {ALL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Pharmacie avec recherche */}
          <div style={{ position: "relative" }}>
            <label style={lbl}>Pharmacie</label>
            {selectedPharmacy ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                border: "1px solid #d1fae5", borderRadius: 12, padding: "10px 14px",
                background: "#f0fdf4",
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#064e3b" }}>
                    {selectedPharmacy.nom}
                  </p>
                  {selectedPharmacy.ville && (
                    <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>{selectedPharmacy.ville}</p>
                  )}
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, pharmacyId: "" }))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{
                    position: "absolute", left: 12, top: "50%",
                    transform: "translateY(-50%)", color: "#9ca3af",
                  }} />
                  <input
                    style={{ ...inp, paddingLeft: 36 }}
                    value={pharmSearch}
                    onChange={e => { setPharmSearch(e.target.value); setShowPharmList(true); }}
                    onFocus={() => setShowPharmList(true)}
                    placeholder="Rechercher une pharmacie..."
                  />
                </div>
                {showPharmList && filteredPharmacies.length > 0 && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                    background: "white", border: "1px solid #e5e7eb", borderRadius: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.1)", maxHeight: 220, overflowY: "auto",
                    marginTop: 4,
                  }}>
                    {filteredPharmacies.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, pharmacyId: p.id }));
                          setPharmSearch("");
                          setShowPharmList(false);
                        }}
                        style={{
                          width: "100%", padding: "10px 16px", border: "none",
                          background: "white", cursor: "pointer", textAlign: "left",
                          borderBottom: "1px solid #f3f4f6",
                          display: "flex", flexDirection: "column", gap: 2,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f0fdf4"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "white"; }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#1f2937" }}>{p.nom}</span>
                        {p.ville && <span style={{ fontSize: 11, color: "#6b7280" }}>{p.ville}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Produits par spécialité */}
          <div>
            <label style={lbl}>
              Produits présentés
              {form.specialty && (
                <span style={{ marginLeft: 8, color: "#059669", fontWeight: 700, fontSize: 11 }}>
                  — {form.specialty}
                </span>
              )}
            </label>
            {selectedProducts.length > 0 && (
              <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedProducts.map(p => (
                  <span key={p} style={{
                    background: "#064e3b", color: "white",
                    padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {p}
                    <button type="button" onClick={() => toggleProduct(p)}
                      style={{ background: "none", border: "none", cursor: "pointer",
                        color: "rgba(255,255,255,0.7)", padding: 0, lineHeight: 1 }}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {availableProducts.map(p => {
                const isSelected = selectedProducts.includes(p);
                return (
                  <button key={p} type="button" onClick={() => toggleProduct(p)} style={{
                    padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${isSelected ? "#064e3b" : "#d1d5db"}`,
                    background: isSelected ? "#064e3b" : "white",
                    color: isSelected ? "white" : "#4b5563",
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={lbl}>Notes de visite *</label>
            <textarea style={{ ...inp, resize: "vertical", minHeight: 100 }}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={4}
              placeholder="Décrivez le déroulement de la visite, les sujets abordés, les retours du médecin..."
              required />
          </div>

          {/* Résumé IA */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ ...lbl, marginBottom: 0 }}>Résumé IA (Gemini)</label>
              <button type="button" onClick={generateAI}
                disabled={generating || !form.notes}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  border: "none", borderRadius: 8, padding: "6px 14px",
                  color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  opacity: (generating || !form.notes) ? 0.6 : 1,
                }}>
                <Sparkles size={13} />
                {generating ? "Génération..." : "Générer"}
              </button>
            </div>
            {aiSummary && (
              <div style={{
                background: "#faf5ff", border: "1px solid #e9d5ff",
                borderRadius: 12, padding: "12px 16px",
                fontSize: 13, color: "#6b21a8", lineHeight: 1.6,
              }}>
                {aiSummary}
              </div>
            )}
          </div>
        </div>

        {/* Bouton soumettre */}
        <button type="submit" style={{
          width: "100%",
          background: "linear-gradient(135deg, #064e3b, #059669)",
          border: "none", borderRadius: 14, padding: "14px",
          color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          boxShadow: "0 4px 16px rgba(6,78,59,0.3)",
        }}>
          <FileText size={18} />
          {isOnline() ? "Soumettre le rapport" : "Sauvegarder hors ligne"}
        </button>
      </form>
    </div>
  );
}