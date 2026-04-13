import { useState }   from "react";
import { useQuery }   from "@tanstack/react-query";
import { Package, Search, ChevronRight } from "lucide-react";
import api from "../../../services/api";

// ── Structure des 4 stratégies depuis le fichier Excel ────────
const STRATEGIES: Record<string, Record<string, Record<string, string[]>>> = {
  "GROUPE DE PRODUITS": {
    "GROUPE 1": {
      "MEDECIN GENERALE":  ["TERCO","CEXIME","FEROXYDE","GUAMEN","DOLBUFEN","CETAFF","COFEN","HEAMOCARE","ROLIK","CYPRONURAN"],
      "CHIRURGIE":         ["CROCIP-TZ","ACICROF-P","PIRRO","ROLIK","FEROXYDE","HEAMOCARE","CYPRONURAN"],
      "NEPHROLOGIE":       ["AZIENT","CROCIP-TZ","CROZOLE"],
    },
    "GROUPE 2": {
      "GYNECO-SAGE FEMME": ["AZIENT","CEXIME","ZIFLUSEC","CROTRIMA V6","FEROXYDE B9","CROGENTA","HEAMOCARE","CYPRONURAN","ROLIK","GESTREL"],
      "DERMATOLOGIE":      ["AZIENT","BETAMECRO","BECLOZOLE","KEOZOL","HEAMOCARE","MRITIZ","CROZOLE"],
      "DIABETOLOGIE":      ["GLIZAR MR","CROFORMIN","PREGIB","HEAMOCARE","CROCIP-TZ","CROZOLE"],
    },
    "GROUPE 3": {
      "PEDIATRIE":         ["CEXIME","CROCILLINE","CROZOLE","GUAMEN","ROLIK","FEROXYDE","TERCO","CYPRONURAN"],
      "KINESIE":           ["CROLINI GEL","BETAMECRO","PIRRO","ACICROF-P","CETAFF","COFEN","DOLBUFEN","ROLIK"],
      "PNEUMOLOGIE":       ["CEXIME","GUAMEN","AZIENT","MRITIZ","BETAMECRO","CROCIP TZ"],
    },
    "GROUPE 4": {
      "ORL":                        ["CEXIME","AZIENT","GUAMEN","MRITIZ","BETAMECRO","COFEN","CROCILLINE","CYPRONURAN","DOLBUFEN"],
      "RHUMATOLOGIE NEURO TRAUMATO":["PIRRO","ACICROF-P","PREGIB","ESOMECRO","BETAMECRO","CROLINI GEL","CROCIP TZ"],
      "OPHTALMOLOGIE":              ["CROGENTA","MRITIZ","BETAMECRO","AZIENT","CROCIP-TZ"],
    },
  },
  "GRP I": {
    "GROUPE 1": {
      "MEDECIN GENERALE":  ["TERCO","CEXIME","FEROXYDE","GUAMEN","FEROXYDE B9","INOBACTAM INJ","COFEN","CYPRONURAN"],
      "CHIRURGIE":         ["CEXIME","ACICROF-P","FEROXYDE B9","INOBACTAM INJ","CYPRONURAN","CROCIP-TZ","BETAMECRO"],
      "NEPHROLOGIE":       ["AZIENT","CROCIP-TZ","CROZOLE"],
    },
    "GROUPE 2": {
      "GYNECO-SAGE FEMME":        ["FEROXYDE B9","CEXIME","CROTRIMA V6","CROGENTA","GUAMEN","CYPRONURAN","GESTREL"],
      "DERMATOLOGIE VENEROLOGIE": ["CROTRIMA V6","BETAMECRO","FEROXYDE B9","CROCIP-TZ","INOBACTAM INJ","SANOZOL"],
      "DIABETOLOGIE":             ["PREGIB","GLIZAR MR","CROCIP-TZ","CROZOLE"],
    },
    "GROUPE 3": {
      "PEDIATRIE":   ["CEXIME","GUAMEN","FEROXYDE B9","TERCO","CYPRONURAN","SANOZOL","CROGENTA"],
      "KINESIE":     ["BETAMECRO","ACICROF-P","COFEN"],
      "PNEUMOLOGIE": ["CEXIME","GUAMEN","BETAMECRO","COFEN / ACICROF P","CROCIP TZ","INOBACTAM"],
    },
    "GROUPE 4": {
      "ORL":                        ["CEXIME","GUAMEN","BETAMECRO","COFEN","CYPRONURAN"],
      "RHUMATOLOGIE NEURO TRAUMATO":["ACICROF-P","PREGIB","ESOMECRO","BETAMECRO","CROCIP TZ"],
      "OPHTALMOLOGIE":              ["CROGENTA","MRITIZ","BETAMECRO","CROCIP-TZ"],
    },
  },
  "GRP II": {
    "GROUPE 1": {
      "MEDECIN GENERALE": ["TRAVICOLD","ANOCURE","DINATE INJECTIABLE","FEROXYDE","DOLBUFEN","CETAFF","HEAMOCARE","ROLIK"],
      "CHIRURGIE":        ["CROCIP-TZ","AZIENT","PIRRO","ROLIK","FEROXYDE","HEAMOCARE","ESOMECRO"],
      "GASTRO":           ["ESOMECRO","AZIENT","CROZOLE","TRAVICOLD"],
    },
    "GROUPE 2": {
      "GYNECO-SAGE FEMME": ["AZIENT","ZIFLUSEC KIT","FEROXYDE","HEAMOCARE","KEOZOL","ROLIK","CROZOLE CP"],
      "DERMATOLOGIE":      ["AZIENT","BECLOZOLE","KEOZOL","HEAMOCARE","CROZOLE"],
      "DIABETOLOGIE":      ["CROFORMIN","HEAMOCARE","ESOMECRO","CROZOLE","MRITIZ"],
    },
    "GROUPE 3": {
      "PEDIATRIE":   ["TRAVICOLD","CROCILLINE","CROZOLE","DINATE","ROLIK","FEROXYDE","KEOZOL","MRITIZ","ANOCURE"],
      "KINESIE":     ["CROLINI GEL","PIRRO","CETAFF","ROLIK","DOLBUFEN","ESOMECRO","KEOZOL"],
      "PNEUMOLOGIE": ["CROCILLINE","TRAVICOLD","AZIENT","MRITIZ","CROZOLE","DOLBUFEN"],
    },
    "GROUPE 4": {
      "ORL":                        ["MRITIZ","CETAFF","TRAVICOLD","CROCILLINE","AZIENT","DOBUFEN"],
      "RHUMATOLOGIE NEURO TRAUMATO":["PIRRO","ESOMECRO","CROLINI GEL"],
      "OPHTALMOLOGIE":              ["AZIENT"],
    },
  },
  "GRP III": {
    "GROUPE 1": {
      "MEDECIN GENERALE": ["TERCO","CEXIME","FEROXYDE","GUAMEN","DOLBUFEN","CETAFF","COFEN","HEAMOCARE","ANOCURE","TRAVICOLD","DINATE","INOBACTAME","ROLIK","CYPRONURAN"],
      "CHIRURGIE":        ["CROCIP-TZ","ACICROF-P","PIRRO","ROLIK","FEROXYDE","HEAMOCARE","CYPRONURAN","INABACTAME"],
      "OPHTALMOLOGIE":    ["AZIENT","CROGENTA","BETAMECRO"],
    },
    "GROUPE 2": {
      "GYNECO-SAGE FEMME":        ["AZIENT","CEXIME","ZIFLUSEC","CROTRIMA V6","FEROXYDE B9","CROGENTA","HEAMOCARE","CYPRONURAN","ROLIK","GESTREL"],
      "DERMATOLOGIE VENEROLOGIE": ["AZIENT","BETAMECRO","BECLOZOLE","KEOZOL","HEAMOCARE","MRITIZ","CROZOLE","INOBACTAME","SANOZOL","CROTRIMA V6","CROCILLINE"],
      "DIABETOLOGIE":             ["GLIZAR MR","CROFORMIN","PREGIB","HEAMOCARE","CROCIP-TZ","CROZOLE","INOBACTAME"],
    },
    "GROUPE 3": {
      "PEDIATRIE":   ["CEXIME","CROCILLINE","CROZOLE","GUAMEN","ROLIK","FEROXYDE","TRAVICOLD","ANOCURE","DINATE","TERCO","CYPRONURAN"],
      "KINESIE":     ["CROLINI GEL","BETAMECRO","PIRRO","ACICROF-P","CETAFF","COFEN","DOLBUFEN","ROLIK","ESOMECRO"],
      "PNEUMOLOGIE": ["CEXIME","GUAMEN","AZIENT","MRITIZ","BETAMECRO","CROCIP TZ"],
    },
    "GROUPE 4": {
      "ORL":                        ["CEXIME","AZIENT","GUAMEN","MRITIZ","BETAMECRO","COFEN","CROCILLINE","TRAVICOLD","CYPRONURAN","DOLBUFEN"],
      "RHUMATOLOGIE NEURO TRAUMATO":["PIRRO","ACICROF-P","PREGIB","ESOMECRO","BETAMECRO","CROLINI GEL","CROCIP TZ","INOBACTAM"],
      "OPHTALMOLOGIE":              ["CROGENTA","MRITIZ","BETAMECRO","AZIENT"],
    },
  },
};

const STRATEGY_COLORS: Record<string, { main: string; light: string; text: string }> = {
  "GROUPE DE PRODUITS": { main: "#064e3b", light: "#f0fdf4", text: "#065f46" },
  "GRP I":              { main: "#1e40af", light: "#eff6ff", text: "#1d4ed8" },
  "GRP II":             { main: "#7c2d12", light: "#fff7ed", text: "#c2410c" },
  "GRP III":            { main: "#581c87", light: "#faf5ff", text: "#7c3aed" },
};

const GROUP_COLORS: Record<string, string> = {
  "GROUPE 1": "#059669",
  "GROUPE 2": "#2563eb",
  "GROUPE 3": "#d97706",
  "GROUPE 4": "#dc2626",
};

const SPECIALTY_ICONS: Record<string, string> = {
  "MEDECIN GENERALE": "🩺", "CHIRURGIE": "🔪", "NEPHROLOGIE": "🫘",
  "GYNECO-SAGE FEMME": "👶", "DERMATOLOGIE": "🧴", "DERMATOLOGIE VENEROLOGIE": "🧴",
  "DIABETOLOGIE": "💉", "PEDIATRIE": "🧒", "KINESIE": "🦴",
  "PNEUMOLOGIE": "🫁", "ORL": "👂", "RHUMATOLOGIE NEURO TRAUMATO": "🧠",
  "OPHTALMOLOGIE": "👁️", "GASTRO": "🫀", "MEDECIN GENERALE (Tous les produits)": "🩺",
};

export default function ProductsTab() {
  const [activeStrategy, setActiveStrategy] = useState("GROUPE DE PRODUITS");
  const [activeGroup,    setActiveGroup]    = useState("GROUPE 1");
  const [search,         setSearch]         = useState("");
  const [expandedSpec,   setExpandedSpec]   = useState<string | null>(null);

  const strategyData = STRATEGIES[activeStrategy];
  const groupData    = strategyData?.[activeGroup] || {};
  const colors       = STRATEGY_COLORS[activeStrategy];
  const groupColor   = GROUP_COLORS[activeGroup];

  // Filtrage par recherche
  const filteredSpecs = Object.entries(groupData).reduce((acc, [spec, prods]) => {
    const filtered = prods.filter(p => p.toLowerCase().includes(search.toLowerCase()));
    if (!search || filtered.length > 0 || spec.toLowerCase().includes(search.toLowerCase()))
      acc[spec] = search ? filtered : prods;
    return acc;
  }, {} as Record<string, string[]>);

  const totalProducts = Object.values(groupData).flat().length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── En-tête ──────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.main} 0%, ${colors.main}cc 100%)`,
        borderRadius: 16, padding: 24, color: "white",
        boxShadow: `0 4px 20px ${colors.main}40`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
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
                {activeStrategy} — {activeGroup} — {totalProducts} produit(s)
              </p>
            </div>
          </div>
          {/* Recherche */}
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.6)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              style={{
                paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 10, color: "white", fontSize: 13, outline: "none", width: 220,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Onglets stratégies ────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.keys(STRATEGIES).map(strat => {
          const c = STRATEGY_COLORS[strat];
          const isActive = activeStrategy === strat;
          return (
            <button key={strat} onClick={() => { setActiveStrategy(strat); setActiveGroup("GROUPE 1"); setExpandedSpec(null); }} style={{
              padding: "10px 18px", borderRadius: 12, border: `2px solid ${isActive ? c.main : "#e5e7eb"}`,
              background: isActive ? c.main : "white", color: isActive ? "white" : "#374151",
              fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: isActive ? `0 4px 12px ${c.main}40` : "none",
            }}>
              {strat}
            </button>
          );
        })}
      </div>

      {/* ── Onglets groupes ───────────────────────────────── */}
      <div style={{
        background: "white", borderRadius: 16, border: "1px solid #e5e7eb",
        padding: 6, display: "flex", gap: 4,
      }}>
        {Object.keys(strategyData).map(grp => {
          const isActive = activeGroup === grp;
          const gc = GROUP_COLORS[grp];
          const count = Object.values(strategyData[grp]).flat().length;
          return (
            <button key={grp} onClick={() => { setActiveGroup(grp); setExpandedSpec(null); }} style={{
              flex: 1, padding: "10px 8px", borderRadius: 12,
              border: `2px solid ${isActive ? gc : "transparent"}`,
              background: isActive ? `${gc}15` : "transparent",
              color: isActive ? gc : "#6b7280",
              fontWeight: isActive ? 700 : 500, fontSize: 12, cursor: "pointer",
              transition: "all 0.15s", textAlign: "center",
            }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{grp}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{count} produits</div>
            </button>
          );
        })}
      </div>

      {/* ── Spécialités et produits ───────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(filteredSpecs).map(([spec, prods]) => {
          const isExpanded = expandedSpec === spec || search.length > 0;
          const icon = SPECIALTY_ICONS[spec] || "💊";
          return (
            <div key={spec} style={{
              background: "white", borderRadius: 16,
              border: `1px solid ${isExpanded ? groupColor + "40" : "#e5e7eb"}`,
              overflow: "hidden", transition: "all 0.2s",
              boxShadow: isExpanded ? `0 4px 16px ${groupColor}20` : "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              {/* Header spécialité */}
              <button
                onClick={() => setExpandedSpec(expandedSpec === spec ? null : spec)}
                style={{
                  width: "100%", padding: "14px 20px",
                  background: isExpanded ? `${groupColor}08` : "white",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderBottom: isExpanded ? `1px solid ${groupColor}20` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1f2937" }}>{spec}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>{prods.length} produit(s)</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    background: `${groupColor}15`, color: groupColor,
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                  }}>
                    {prods.length}
                  </span>
                  <ChevronRight size={16} color="#9ca3af" style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }} />
                </div>
              </button>

              {/* Liste produits */}
              {isExpanded && (
                <div style={{ padding: "12px 20px 16px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {prods.map(prod => (
                      <span key={prod} style={{
                        background: `${groupColor}10`,
                        border: `1px solid ${groupColor}30`,
                        color: groupColor,
                        padding: "6px 14px", borderRadius: 20,
                        fontSize: 12, fontWeight: 600,
                        letterSpacing: 0.3,
                      }}>
                        {prod}
                      </span>
                    ))}
                    {prods.length === 0 && (
                      <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
                        Aucun produit correspondant à la recherche
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.5) !important; }
      `}</style>
    </div>
  );
}