import { useState } from "react";
import { Package, Search, ChevronRight } from "lucide-react";

// ── Tous les produits regroupés uniquement par spécialité ─────
const SPECIALITES: Record<string, string[]> = {
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
    "AZIENT","BETAMECRO","BECLOZOLE","KEOZOL","HEAMOCARE",
    "MRITIZ","CROZOLE",
  ],
  "DERMATOLOGIE VENEROLOGIE": [
    "AZIENT","BETAMECRO","BECLOZOLE","KEOZOL","HEAMOCARE","MRITIZ",
    "CROZOLE","INOBACTAME","SANOZOL","CROTRIMA V6","CROCILLINE",
  ],
  "DIABETOLOGIE": [
    "GLIZAR MR","CROFORMIN","PREGIB","HEAMOCARE",
    "CROCIP-TZ","CROZOLE","ESOMECRO","MRITIZ",
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
    "CEXIME","GUAMEN","AZIENT","MRITIZ","BETAMECRO",
    "CROCIP TZ","COFEN / ACICROF P","INOBACTAM","CROCILLINE",
    "TRAVICOLD","CROZOLE","DOLBUFEN",
  ],
  "ORL": [
    "CEXIME","AZIENT","GUAMEN","MRITIZ","BETAMECRO","COFEN",
    "CROCILLINE","CYPRONURAN","DOLBUFEN","CETAFF","TRAVICOLD","DOBUFEN",
  ],
  "RHUMATOLOGIE NEURO TRAUMATO": [
    "PIRRO","ACICROF-P","PREGIB","ESOMECRO","BETAMECRO",
    "CROLINI GEL","CROCIP TZ","INOBACTAM",
  ],
  "OPHTALMOLOGIE": [
    "CROGENTA","MRITIZ","BETAMECRO","AZIENT","CROCIP-TZ",
  ],
};

const SPECIALTY_ICONS: Record<string, string> = {
  "MEDECIN GENERALE":            "🩺",
  "CHIRURGIE":                   "🔪",
  "NEPHROLOGIE":                 "🫘",
  "GASTRO":                      "🫀",
  "GYNECO-SAGE FEMME":           "👶",
  "DERMATOLOGIE":                "🧴",
  "DERMATOLOGIE VENEROLOGIE":    "🧴",
  "DIABETOLOGIE":                "💉",
  "PEDIATRIE":                   "🧒",
  "KINESIE":                     "🦴",
  "PNEUMOLOGIE":                 "🫁",
  "ORL":                         "👂",
  "RHUMATOLOGIE NEURO TRAUMATO": "🧠",
  "OPHTALMOLOGIE":               "👁️",
};

const SPECIALTY_COLORS: Record<string, string> = {
  "MEDECIN GENERALE":            "#059669",
  "CHIRURGIE":                   "#dc2626",
  "NEPHROLOGIE":                 "#7c3aed",
  "GASTRO":                      "#ea580c",
  "GYNECO-SAGE FEMME":           "#db2777",
  "DERMATOLOGIE":                "#0891b2",
  "DERMATOLOGIE VENEROLOGIE":    "#0891b2",
  "DIABETOLOGIE":                "#2563eb",
  "PEDIATRIE":                   "#16a34a",
  "KINESIE":                     "#ca8a04",
  "PNEUMOLOGIE":                 "#0284c7",
  "ORL":                         "#9333ea",
  "RHUMATOLOGIE NEURO TRAUMATO": "#b45309",
  "OPHTALMOLOGIE":               "#0f766e",
};

export default function ProductsTab() {
  const [search,       setSearch]       = useState("");
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null);

  const totalProduits = [...new Set(Object.values(SPECIALITES).flat())].length;

  // Filtre par recherche
  const filteredSpecs = Object.entries(SPECIALITES).reduce((acc, [spec, prods]) => {
    const filtered = prods.filter(p =>
      p.toLowerCase().includes(search.toLowerCase()) ||
      spec.toLowerCase().includes(search.toLowerCase())
    );
    if (!search || filtered.length > 0)
      acc[spec] = search ? filtered : prods;
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── En-tête ──────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #064e3b 0%, #059669 100%)",
        borderRadius: 16, padding: 24, color: "white",
        boxShadow: "0 4px 20px rgba(6,78,59,0.3)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Package size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "Georgia, serif" }}>
              Catalogue Produits
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.75 }}>
              {Object.keys(SPECIALITES).length} spécialités — {totalProduits} produits uniques
            </p>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{
            position: "absolute", left: 12, top: "50%",
            transform: "translateY(-50%)", color: "rgba(255,255,255,0.6)",
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{
              paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 10, color: "white", fontSize: 13,
              outline: "none", width: 200,
            }}
          />
        </div>
      </div>

      {/* ── Grille des spécialités ───────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(filteredSpecs).map(([spec, prods]) => {
          const isExpanded = expandedSpec === spec || !!search;
          const icon  = SPECIALTY_ICONS[spec]  || "💊";
          const color = SPECIALTY_COLORS[spec] || "#059669";

          return (
            <div key={spec} style={{
              background: "white", borderRadius: 14,
              border: `1px solid ${isExpanded ? color + "40" : "#e5e7eb"}`,
              overflow: "hidden", transition: "all 0.2s",
              boxShadow: isExpanded ? `0 4px 16px ${color}15` : "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <button
                onClick={() => setExpandedSpec(expandedSpec === spec ? null : spec)}
                style={{
                  width: "100%", padding: "14px 20px",
                  background: isExpanded ? `${color}06` : "white",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: isExpanded ? `1px solid ${color}20` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: `${color}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>
                    {icon}
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1f2937" }}>
                      {spec}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>
                      {prods.length} produit(s)
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    background: `${color}15`, color,
                    fontSize: 11, fontWeight: 700,
                    padding: "3px 10px", borderRadius: 20,
                  }}>
                    {prods.length}
                  </span>
                  <ChevronRight size={16} color="#9ca3af" style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }} />
                </div>
              </button>

              {isExpanded && (
                <div style={{ padding: "14px 20px 18px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {prods.map(prod => (
                      <span key={prod} style={{
                        background: `${color}10`,
                        border: `1px solid ${color}30`,
                        color,
                        padding: "6px 14px", borderRadius: 20,
                        fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
                      }}>
                        {prod}
                      </span>
                    ))}
                    {prods.length === 0 && (
                      <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
                        Aucun résultat
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`input::placeholder { color: rgba(255,255,255,0.5) !important; }`}</style>
    </div>
  );
}