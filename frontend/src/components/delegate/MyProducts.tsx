import { useState }  from "react";
import { useQuery }  from "@tanstack/react-query";
import { Package, Search, X, ChevronRight } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

// ── Catalogue CROIENT (hardcodé, identique à l'admin) ────────
const SPECIALITES_CROIENT: Record<string, string[]> = {
  "MEDECIN GENERALE":              ["TERCO","CEXIME","FEROXYDE","GUAMEN","DOLBUFEN","CETAFF","COFEN","HEAMOCARE","ROLIK","CYPRONURAN","ANOCURE","TRAVICOLD","DINATE","INOBACTAME","DINATE INJECTIABLE","FEROXYDE B9","INOBACTAM INJ"],
  "CHIRURGIE":                     ["CROCIP-TZ","ACICROF-P","PIRRO","HEAMOCARE","CYPRONURAN","BETAMECRO","INABACTAME","ROLIK","FEROXYDE","ESOMECRO","AZIENT"],
  "NEPHROLOGIE":                   ["AZIENT","CROCIP-TZ","CROZOLE"],
  "GASTRO":                        ["ESOMECRO","AZIENT","CROZOLE","TRAVICOLD"],
  "GYNECO-SAGE FEMME":             ["AZIENT","CEXIME","ZIFLUSEC","ZIFLUSEC KIT","CROTRIMA V6","FEROXYDE B9","CROGENTA","HEAMOCARE","CYPRONURAN","ROLIK","GESTREL","CROZOLE CP","FEROXYDE","KEOZOL"],
  "DERMATOLOGIE":                  ["AZIENT","BETAMECRO","BECLOZOLE","KEOZOL","HEAMOCARE","MRITIZ","CROZOLE"],
  "DERMATOLOGIE VENEROLOGIE":      ["AZIENT","BETAMECRO","BECLOZOLE","KEOZOL","HEAMOCARE","MRITIZ","CROZOLE","INOBACTAME","SANOZOL","CROTRIMA V6","CROCILLINE"],
  "DIABETOLOGIE":                  ["GLIZAR MR","CROFORMIN","PREGIB","HEAMOCARE","CROCIP-TZ","CROZOLE","ESOMECRO","MRITIZ"],
  "PEDIATRIE":                     ["CEXIME","CROCILLINE","CROZOLE","GUAMEN","ROLIK","FEROXYDE","TERCO","CYPRONURAN","TRAVICOLD","ANOCURE","DINATE","KEOZOL","MRITIZ"],
  "KINESIE":                       ["CROLINI GEL","BETAMECRO","PIRRO","ACICROF-P","CETAFF","COFEN","DOLBUFEN","ROLIK","ESOMECRO","KEOZOL"],
  "PNEUMOLOGIE":                   ["CEXIME","GUAMEN","AZIENT","MRITIZ","BETAMECRO","CROCIP TZ","COFEN / ACICROF P","INOBACTAM","CROCILLINE","TRAVICOLD","CROZOLE","DOLBUFEN"],
  "ORL":                           ["CEXIME","AZIENT","GUAMEN","MRITIZ","BETAMECRO","COFEN","CROCILLINE","CYPRONURAN","DOLBUFEN","CETAFF","TRAVICOLD","DOBUFEN"],
  "RHUMATOLOGIE NEURO TRAUMATO":   ["PIRRO","ACICROF-P","PREGIB","ESOMECRO","BETAMECRO","CROLINI GEL","CROCIP TZ","INOBACTAM"],
  "OPHTALMOLOGIE":                 ["CROGENTA","MRITIZ","BETAMECRO","AZIENT","CROCIP-TZ"],
};

const ICONS: Record<string, string> = {
  "MEDECIN GENERALE":"🩺","CHIRURGIE":"🔪","NEPHROLOGIE":"🫘","GASTRO":"🫀",
  "GYNECO-SAGE FEMME":"👶","DERMATOLOGIE":"🧴","DERMATOLOGIE VENEROLOGIE":"🧴",
  "DIABETOLOGIE":"💉","PEDIATRIE":"🧒","KINESIE":"🦴","PNEUMOLOGIE":"🫁",
  "ORL":"👂","RHUMATOLOGIE NEURO TRAUMATO":"🧠","OPHTALMOLOGIE":"👁️",
};

const SPEC_COLORS: Record<string, string> = {
  "MEDECIN GENERALE":"#059669","CHIRURGIE":"#dc2626","NEPHROLOGIE":"#7c3aed",
  "GASTRO":"#ea580c","GYNECO-SAGE FEMME":"#db2777","DERMATOLOGIE":"#0891b2",
  "DERMATOLOGIE VENEROLOGIE":"#0891b2","DIABETOLOGIE":"#2563eb","PEDIATRIE":"#16a34a",
  "KINESIE":"#ca8a04","PNEUMOLOGIE":"#0284c7","ORL":"#9333ea",
  "RHUMATOLOGIE NEURO TRAUMATO":"#b45309","OPHTALMOLOGIE":"#0f766e",
};

export default function MyProducts() {
  const { user } = useAuth();
  // Labs du délégué — déclaré ici pour être utilisé dans defaultLab
  const userLabs: string[] = (user as any)?.labs || [];
  const [search,       setSearch]       = useState("");
  // Vue par défaut = premier labo du délégué
  const defaultLab = userLabs[0]?.toLowerCase() || "croient";
  const [activeView,   setActiveView]   = useState(defaultLab);
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null);
  const [selectedProd, setSelectedProd] = useState<{ name: string; spec: string } | null>(null);

  // Produits depuis API
  const { data: dbProducts } = useQuery({
    queryKey: ["products-db"],
    queryFn:  () => api.get("/products").then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  // Labos disponibles
  const { data: labs } = useQuery({
    queryKey: ["laboratories"],
    queryFn:  () => api.get("/laboratories").then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const dbList: any[] = Array.isArray(dbProducts) ? dbProducts : [];
  const labsList: string[] = Array.isArray(labs)
    ? labs.map((l: any) => l.name).filter((n: string) => n.toLowerCase() !== "croient" && n.toLowerCase() !== "lic-pharma")
    : [];

  // Construire le catalogue selon la vue
  const buildCatalog = (view: string): Record<string, string[]> => {
    if (view === "croient") {
      const catalog = { ...SPECIALITES_CROIENT };
      dbList.filter(p => p.laboratory?.name?.toLowerCase() === "croient" || p.group?.toLowerCase() === "croient")
        .forEach(p => {
          if (!catalog[p.specialty]) catalog[p.specialty] = [];
          if (!catalog[p.specialty].includes(p.name)) catalog[p.specialty].push(p.name);
        });
      return catalog;
    }
    if (view === "global") {
      const catalog: Record<string, string[]> = { ...SPECIALITES_CROIENT };
      dbList.forEach(p => {
        const spec = p.specialty || "GÉNÉRAL";
        if (!catalog[spec]) catalog[spec] = [];
        if (!catalog[spec].includes(p.name)) catalog[spec].push(p.name);
      });
      return catalog;
    }
    const catalog: Record<string, string[]> = {};
    dbList.filter(p => p.laboratory?.name?.toLowerCase() === view.toLowerCase())
      .forEach(p => {
        const spec = p.specialty || "GÉNÉRAL";
        if (!catalog[spec]) catalog[spec] = [];
        catalog[spec].push(p.name);
      });
    return catalog;
  };

  const catalog      = buildCatalog(activeView);
  const totalProduits = [...new Set(Object.values(catalog).flat())].length;

  // Filtrer par recherche
  const filteredSpecs = Object.entries(catalog).reduce((acc, [spec, prods]) => {
    const filtered = prods.filter(p =>
      p.toLowerCase().includes(search.toLowerCase()) ||
      spec.toLowerCase().includes(search.toLowerCase())
    );
    if (!search || filtered.length > 0) acc[spec] = search ? filtered : prods;
    return acc;
  }, {} as Record<string, string[]>);

  const canSeeView = (view: string) => {
    // Pas de labs assignés = voir tout (mode fallback)
    if (userLabs.length === 0) return view === "croient";
    return userLabs.some(l => l.toLowerCase() === view.toLowerCase());
  };

  return (
    <div className="space-y-4">

      {/* Banner */}
      <div style={{
        background: "linear-gradient(135deg, #064e3b 0%, #059669 100%)",
        borderRadius: 20, padding: 20, color: "white",
        boxShadow: "0 4px 20px rgba(6,78,59,0.25)",
      }}>
        <div className="flex items-center gap-3 mb-3">
          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Package size={22} />
          </div>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>Catalogue Produits</h2>
            <p style={{ margin:0, fontSize:12, opacity:0.7 }}>
              {Object.keys(filteredSpecs).length} spécialités — {totalProduits} produits
            </p>
          </div>
        </div>

        {/* Recherche */}
        <div style={{ position:"relative" }}>
          <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.6)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un produit ou spécialité…"
            style={{ width:"100%", paddingLeft:36, paddingRight:36, paddingTop:10, paddingBottom:10,
              background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)",
              borderRadius:12, color:"white", fontSize:13, outline:"none", boxSizing:"border-box" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer", padding:0 }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Onglets labo */}
        <div className="flex flex-wrap gap-2 mt-3">
          {canSeeView("croient") && (
            <button onClick={() => setActiveView("croient")}
              style={{ padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                background: activeView==="croient" ? "white" : "rgba(255,255,255,0.15)",
                color: activeView==="croient" ? "#064e3b" : "rgba(255,255,255,0.85)" }}>
              🔬 CROIENT
            </button>
          )}
          {canSeeView("lic-pharma") && dbList.some(p => p.laboratory?.name?.toLowerCase() === "lic-pharma") && (
            <button onClick={() => setActiveView("lic-pharma")}
              style={{ padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                background: activeView==="lic-pharma" ? "white" : "rgba(255,255,255,0.15)",
                color: activeView==="lic-pharma" ? "#1d4ed8" : "rgba(255,255,255,0.85)" }}>
              💊 LIC PHARMA
            </button>
          )}
          {labsList.filter(canSeeView).map(lab => (
            <button key={lab} onClick={() => setActiveView(lab.toLowerCase())}
              style={{ padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                background: activeView===lab.toLowerCase() ? "white" : "rgba(255,255,255,0.15)",
                color: activeView===lab.toLowerCase() ? "#6b21a8" : "rgba(255,255,255,0.85)" }}>
              🏭 {lab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Spécialités */}
      {Object.keys(filteredSpecs).length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
          <Package size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Aucun produit disponible</p>
          {search
            ? <button onClick={() => setSearch("")} className="text-emerald-600 text-sm mt-2 hover:underline">Effacer la recherche</button>
            : <p className="text-xs mt-2 max-w-xs mx-auto">L'administrateur n'a pas encore ajouté de produits pour ce laboratoire</p>
          }
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(filteredSpecs).map(([spec, prods]) => {
            const isOpen = expandedSpec === spec;
            const color  = SPEC_COLORS[spec] || "#6b7280";
            const icon   = ICONS[spec] || "💊";
            return (
              <div key={spec} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header spécialité */}
                <button
                  onClick={() => setExpandedSpec(isOpen ? null : spec)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: color + "18" }}>
                      {icon}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800 text-sm">{spec}</p>
                      <p className="text-xs text-gray-400">{prods.length} produit{prods.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 transition-transform flex-shrink-0"
                    style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
                </button>

                {/* Produits (expanded) */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-gray-50">
                    <div className="flex flex-wrap gap-2 pt-3">
                      {prods.map((p) => (
                        <button
                          key={p}
                          onClick={() => setSelectedProd({ name: p, spec })}
                          className="text-sm px-3 py-1.5 rounded-xl font-semibold transition hover:opacity-80 active:scale-95"
                          style={{ background: color + "18", color }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal produit — lecture seule */}
      {selectedProd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProd(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-800 text-lg">{selectedProd.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{selectedProd.spec}</p>
              </div>
              <button onClick={() => setSelectedProd(null)} className="text-gray-400 hover:text-gray-600 ml-3"><X size={20} /></button>
            </div>
            <div className="p-5">
              {(() => {
                const dbProd = dbList.find(p => p.name === selectedProd.name);
                if (!dbProd) return <p className="text-sm text-gray-400 italic text-center">Produit CROIENT</p>;
                return (
                  <div className="space-y-3">
                    {[
                      { label: "DCI",             value: dbProd.dci            },
                      { label: "Dosage",           value: dbProd.dosage         },
                      { label: "Forme",            value: dbProd.forme          },
                      { label: "Conditionnement",  value: dbProd.conditionnement},
                      { label: "Description",      value: dbProd.description    },
                    ].filter(f => f.value).map(({ label, value }) => (
                      <div key={label} className="flex gap-3 items-start">
                        <span className="text-xs font-semibold text-gray-400 w-32 flex-shrink-0 uppercase tracking-wide mt-0.5">{label}</span>
                        <span className="text-sm text-gray-800 font-medium">{value}</span>
                      </div>
                    ))}
                    {![dbProd.dci, dbProd.dosage, dbProd.forme].some(Boolean) && (
                      <p className="text-sm text-gray-400 italic text-center">Pas d'informations complémentaires</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
