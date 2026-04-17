import { useState }                              from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Search, ChevronRight, Plus, X, Layers } from "lucide-react";
import api          from "../../../services/api";
import { useAuth }  from "../../../contexts/AuthContext";
import { useLab }   from "../../../contexts/LabContext";

// ── Produits CROIENT (hardcodés + DB) ─────────────────────────
const SPECIALITES_CROIENT: Record<string, string[]> = {
  "MEDECIN GENERALE": ["TERCO","CEXIME","FEROXYDE","GUAMEN","DOLBUFEN","CETAFF","COFEN","HEAMOCARE","ROLIK","CYPRONURAN","ANOCURE","TRAVICOLD","DINATE","INOBACTAME","DINATE INJECTIABLE","FEROXYDE B9","INOBACTAM INJ"],
  "CHIRURGIE":        ["CROCIP-TZ","ACICROF-P","PIRRO","HEAMOCARE","CYPRONURAN","BETAMECRO","INABACTAME","ROLIK","FEROXYDE","ESOMECRO","AZIENT"],
  "NEPHROLOGIE":      ["AZIENT","CROCIP-TZ","CROZOLE"],
  "GASTRO":           ["ESOMECRO","AZIENT","CROZOLE","TRAVICOLD"],
  "GYNECO-SAGE FEMME":["AZIENT","CEXIME","ZIFLUSEC","ZIFLUSEC KIT","CROTRIMA V6","FEROXYDE B9","CROGENTA","HEAMOCARE","CYPRONURAN","ROLIK","GESTREL","CROZOLE CP","FEROXYDE","KEOZOL"],
  "DERMATOLOGIE":     ["AZIENT","BETAMECRO","BECLOZOLE","KEOZOL","HEAMOCARE","MRITIZ","CROZOLE"],
  "DERMATOLOGIE VENEROLOGIE": ["AZIENT","BETAMECRO","BECLOZOLE","KEOZOL","HEAMOCARE","MRITIZ","CROZOLE","INOBACTAME","SANOZOL","CROTRIMA V6","CROCILLINE"],
  "DIABETOLOGIE":     ["GLIZAR MR","CROFORMIN","PREGIB","HEAMOCARE","CROCIP-TZ","CROZOLE","ESOMECRO","MRITIZ"],
  "PEDIATRIE":        ["CEXIME","CROCILLINE","CROZOLE","GUAMEN","ROLIK","FEROXYDE","TERCO","CYPRONURAN","TRAVICOLD","ANOCURE","DINATE","KEOZOL","MRITIZ"],
  "KINESIE":          ["CROLINI GEL","BETAMECRO","PIRRO","ACICROF-P","CETAFF","COFEN","DOLBUFEN","ROLIK","ESOMECRO","KEOZOL"],
  "PNEUMOLOGIE":      ["CEXIME","GUAMEN","AZIENT","MRITIZ","BETAMECRO","CROCIP TZ","COFEN / ACICROF P","INOBACTAM","CROCILLINE","TRAVICOLD","CROZOLE","DOLBUFEN"],
  "ORL":              ["CEXIME","AZIENT","GUAMEN","MRITIZ","BETAMECRO","COFEN","CROCILLINE","CYPRONURAN","DOLBUFEN","CETAFF","TRAVICOLD","DOBUFEN"],
  "RHUMATOLOGIE NEURO TRAUMATO": ["PIRRO","ACICROF-P","PREGIB","ESOMECRO","BETAMECRO","CROLINI GEL","CROCIP TZ","INOBACTAM"],
  "OPHTALMOLOGIE":    ["CROGENTA","MRITIZ","BETAMECRO","AZIENT","CROCIP-TZ"],
};

const ICONS: Record<string, string> = {
  "MEDECIN GENERALE":"🩺","CHIRURGIE":"🔪","NEPHROLOGIE":"🫘","GASTRO":"🫀",
  "GYNECO-SAGE FEMME":"👶","DERMATOLOGIE":"🧴","DERMATOLOGIE VENEROLOGIE":"🧴",
  "DIABETOLOGIE":"💉","PEDIATRIE":"🧒","KINESIE":"🦴","PNEUMOLOGIE":"🫁",
  "ORL":"👂","RHUMATOLOGIE NEURO TRAUMATO":"🧠","OPHTALMOLOGIE":"👁️",
};

const COLORS: Record<string, string> = {
  "MEDECIN GENERALE":"#059669","CHIRURGIE":"#dc2626","NEPHROLOGIE":"#7c3aed",
  "GASTRO":"#ea580c","GYNECO-SAGE FEMME":"#db2777","DERMATOLOGIE":"#0891b2",
  "DERMATOLOGIE VENEROLOGIE":"#0891b2","DIABETOLOGIE":"#2563eb","PEDIATRIE":"#16a34a",
  "KINESIE":"#ca8a04","PNEUMOLOGIE":"#0284c7","ORL":"#9333ea",
  "RHUMATOLOGIE NEURO TRAUMATO":"#b45309","OPHTALMOLOGIE":"#0f766e",
};

export default function ProductsTab() {
  const { user }           = useAuth();
  const { labName }        = useLab();
  const qc                 = useQueryClient();
  const isSuperAdmin       = user?.role === "SUPER_ADMIN";
  const isAdmin            = user?.role === "ADMIN";

  // Vue active : "croient" | "lic-pharma" | "global" | nom d'un labo dynamique
  const [activeView,   setActiveView]   = useState<string>("croient");
  const [search,       setSearch]       = useState("");
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null);

  // Modal ajout produit
  const [showAdd,      setShowAdd]      = useState(false);
  const [addName,      setAddName]      = useState("");
  const [addSpec,      setAddSpec]      = useState("");
  const [addNewSpec,   setAddNewSpec]   = useState("");
  const [useNewSpec,   setUseNewSpec]   = useState(false);
  const [addLab,       setAddLab]       = useState("croient");
  const [addError,     setAddError]     = useState("");
  const [addSuccess,   setAddSuccess]   = useState("");

  // Modal ajout laboratoire (super admin seulement)
  const [showAddLab,   setShowAddLab]   = useState(false);
  const [newLabName,   setNewLabName]   = useState("");
  const [newLabColor,  setNewLabColor]  = useState("#059669");
  const [labError,     setLabError]     = useState("");
  const [labSuccess,   setLabSuccess]   = useState("");

  // Produits dynamiques depuis l'API
  const { data: dbProducts } = useQuery({
    queryKey: ["products-db"],
    queryFn:  () => api.get("/products").then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  // Laboratories depuis l'API
  const { data: labs } = useQuery({
    queryKey: ["laboratories"],
    queryFn:  () => api.get("/laboratories").then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const addProductMut = useMutation({
    mutationFn: (body: any) => api.post("/products", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products-db"] });
      setAddSuccess("Produit ajouté avec succès !");
      setAddName(""); setAddSpec(""); setAddNewSpec(""); setUseNewSpec(false);
      setTimeout(() => { setShowAdd(false); setAddSuccess(""); }, 1500);
    },
    onError: (e: any) => setAddError(e?.response?.data?.error || "Erreur lors de l'ajout"),
  });

  const addLabMut = useMutation({
    mutationFn: (body: any) => api.post("/laboratories/create", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["laboratories"] });
      setLabSuccess("Laboratoire créé avec succès !");
      setNewLabName(""); setNewLabColor("#059669");
      setTimeout(() => { setShowAddLab(false); setLabSuccess(""); }, 1500);
    },
    onError: (e: any) => setLabError(e?.response?.data?.error || "Erreur lors de la création"),
  });

  // ── Construire catalogue selon la vue active ─────────────
  const buildCatalog = (view: string): Record<string, string[]> => {
    const dbList: any[] = Array.isArray(dbProducts) ? dbProducts : [];

    if (view === "croient") {
      // Produits hardcodés croient + DB croient
      const catalog = { ...SPECIALITES_CROIENT };
      dbList.filter(p => p.laboratory?.name?.toLowerCase() === "croient" || p.group?.toLowerCase() === "croient")
        .forEach(p => {
          if (!catalog[p.specialty]) catalog[p.specialty] = [];
          if (!catalog[p.specialty].includes(p.name)) catalog[p.specialty].push(p.name);
        });
      return catalog;
    }

    if (view === "global") {
      // Tous les produits de tous les labos
      const catalog: Record<string, string[]> = {};
      // D'abord les produits croient
      Object.entries(SPECIALITES_CROIENT).forEach(([spec, prods]) => {
        catalog[spec] = [...prods];
      });
      // Puis les produits DB des autres labos
      dbList.forEach(p => {
        const spec = p.specialty || "GÉNÉRAL";
        if (!catalog[spec]) catalog[spec] = [];
        if (!catalog[spec].includes(p.name)) catalog[spec].push(p.name);
      });
      return catalog;
    }

    // Labo spécifique (lic-pharma ou autre labo dynamique)
    const catalog: Record<string, string[]> = {};
    dbList
      .filter(p => p.laboratory?.name?.toLowerCase() === view.toLowerCase())
      .forEach(p => {
        const spec = p.specialty || "GÉNÉRAL";
        if (!catalog[spec]) catalog[spec] = [];
        catalog[spec].push(p.name);
      });
    return catalog;
  };

  const catalog = buildCatalog(activeView);

  const filteredSpecs = Object.entries(catalog).reduce((acc, [spec, prods]) => {
    const filtered = prods.filter(p =>
      p.toLowerCase().includes(search.toLowerCase()) ||
      spec.toLowerCase().includes(search.toLowerCase())
    );
    if (!search || filtered.length > 0) acc[spec] = search ? filtered : prods;
    return acc;
  }, {} as Record<string, string[]>);

  const totalProduits = [...new Set(Object.values(catalog).flat())].length;

  // ── Onglets de vue disponibles ──────────────────────────
  const labsList: string[] = Array.isArray(labs)
    ? labs.map((l: any) => l.name).filter((n: string) => n.toLowerCase() !== "croient" && n.toLowerCase() !== "lic-pharma")
    : [];

  const canSeeLabView = (labView: string) => {
    if (isSuperAdmin) return true;
    if (!isAdmin) return false;
    // Admin ne voit que son labo
    return (user?.labs || []).some((l: string) => l.toLowerCase() === labView.toLowerCase());
  };

  const handleAddProduct = () => {
    setAddError(""); setAddSuccess("");
    if (!addName.trim()) return setAddError("Le nom du produit est obligatoire");
    const spec = useNewSpec ? addNewSpec.trim() : addSpec.trim();
    if (!spec) return setAddError("La spécialité est obligatoire");
    addProductMut.mutate({ name: addName.trim(), specialty: spec, laboratory: addLab });
  };

  // Spécialités disponibles pour le formulaire
  const allSpecs = [...new Set([
    ...Object.keys(SPECIALITES_CROIENT),
    ...(Array.isArray(dbProducts) ? dbProducts.map((p: any) => p.specialty).filter(Boolean) : []),
  ])];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* En-tête */}
      <div style={{
        background:"linear-gradient(135deg, #064e3b 0%, #059669 100%)",
        borderRadius:16, padding:24, color:"white",
        boxShadow:"0 4px 20px rgba(6,78,59,0.3)",
      }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:52, height:52, borderRadius:14, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Package size={26} />
            </div>
            <div>
              <h2 style={{ margin:0, fontSize:20, fontWeight:700, fontFamily:"Georgia,serif" }}>Catalogue Produits</h2>
              <p style={{ margin:"4px 0 0", fontSize:13, opacity:0.75 }}>
                {Object.keys(filteredSpecs).length} spécialités — {totalProduits} produits
              </p>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            {/* Recherche */}
            <div style={{ position:"relative" }}>
              <Search size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.6)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                style={{ paddingLeft:36, paddingRight:14, paddingTop:9, paddingBottom:9, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:10, color:"white", fontSize:13, outline:"none", width:200 }} />
            </div>
            {/* Bouton Ajouter produit */}
            {(isSuperAdmin || isAdmin) && (
              <button onClick={() => { setShowAdd(true); setAddError(""); setAddSuccess(""); setAddName(""); setAddSpec(""); }}
                style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:10, padding:"8px 16px", color:"white", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                <Plus size={15} /> Ajouter un produit
              </button>
            )}
            {/* Bouton Nouveau labo (super admin seulement) */}
            {isSuperAdmin && (
              <button onClick={() => { setShowAddLab(true); setLabError(""); setLabSuccess(""); }}
                style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:10, padding:"8px 16px", color:"rgba(255,255,255,0.85)", fontSize:13, cursor:"pointer" }}>
                <Layers size={15} /> Nouveau laboratoire
              </button>
            )}
          </div>
        </div>

        {/* Onglets de vue */}
        <div style={{ display:"flex", gap:8, marginTop:20, flexWrap:"wrap" }}>
          {/* Croient — visible par admin croient ou super admin */}
          {canSeeLabView("croient") && (
            <button onClick={() => setActiveView("croient")}
              style={{ padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                background: activeView === "croient" ? "white" : "rgba(255,255,255,0.15)",
                color: activeView === "croient" ? "#064e3b" : "rgba(255,255,255,0.85)", transition:"all 0.15s" }}>
              🔬 CROIENT
            </button>
          )}
          {/* Lic Pharma — visible par admin lic-pharma ou super admin */}
          {canSeeLabView("lic-pharma") && (
            <button onClick={() => setActiveView("lic-pharma")}
              style={{ padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                background: activeView === "lic-pharma" ? "white" : "rgba(255,255,255,0.15)",
                color: activeView === "lic-pharma" ? "#1d4ed8" : "rgba(255,255,255,0.85)", transition:"all 0.15s" }}>
              💊 LIC PHARMA
            </button>
          )}
          {/* Labos dynamiques */}
          {labsList.filter(canSeeLabView).map(lab => (
            <button key={lab} onClick={() => setActiveView(lab.toLowerCase())}
              style={{ padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                background: activeView === lab.toLowerCase() ? "white" : "rgba(255,255,255,0.15)",
                color: activeView === lab.toLowerCase() ? "#6b21a8" : "rgba(255,255,255,0.85)", transition:"all 0.15s" }}>
              🏭 {lab.toUpperCase()}
            </button>
          ))}
          {/* Vue globale — super admin seulement */}
          {isSuperAdmin && (
            <button onClick={() => setActiveView("global")}
              style={{ padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                background: activeView === "global" ? "white" : "rgba(255,255,255,0.15)",
                color: activeView === "global" ? "#92400e" : "rgba(255,255,255,0.85)", transition:"all 0.15s" }}>
              🌐 VUE GLOBALE
            </button>
          )}
        </div>
        {/* Badge labo actif */}
        <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, opacity:0.65 }}>Catalogue affiché :</span>
          <span style={{ fontSize:11, fontWeight:700, background:"rgba(255,255,255,0.2)", borderRadius:20, padding:"2px 10px" }}>
            {activeView === "global" ? "Tous les laboratoires" : activeView.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Catalogue */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {Object.keys(filteredSpecs).length === 0 ? (
          <div style={{ background:"white", borderRadius:14, padding:40, textAlign:"center", color:"#9ca3af" }}>
            <Package size={40} style={{ margin:"0 auto 12px", display:"block", opacity:0.3 }} />
            <p style={{ margin:0, fontWeight:600 }}>Aucun produit trouvé</p>
            <p style={{ margin:"4px 0 0", fontSize:12 }}>
              {activeView === "lic-pharma" ? "Ajoutez des produits LIC PHARMA via le bouton ci-dessus" : "Essayez une autre recherche"}
            </p>
          </div>
        ) : Object.entries(filteredSpecs).map(([spec, prods]) => {
          const isExpanded = expandedSpec === spec || !!search;
          const icon  = ICONS[spec]  || "💊";
          const color = COLORS[spec] || "#059669";
          return (
            <div key={spec} style={{
              background:"white", borderRadius:14,
              border:`1px solid ${isExpanded ? color + "40" : "#e5e7eb"}`,
              overflow:"hidden", transition:"all 0.2s",
              boxShadow: isExpanded ? `0 4px 16px ${color}15` : "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <button onClick={() => setExpandedSpec(expandedSpec === spec ? null : spec)}
                style={{ width:"100%", padding:"14px 20px", background: isExpanded ? `${color}06` : "white", border:"none", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  borderBottom: isExpanded ? `1px solid ${color}20` : "none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:42, height:42, borderRadius:12, flexShrink:0, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{icon}</div>
                  <div style={{ textAlign:"left" }}>
                    <p style={{ margin:0, fontWeight:700, fontSize:14, color:"#1f2937" }}>{spec}</p>
                    <p style={{ margin:0, fontSize:11, color:"#6b7280" }}>{prods.length} produit(s)</p>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ background:`${color}15`, color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>{prods.length}</span>
                  <ChevronRight size={16} color="#9ca3af" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition:"transform 0.2s" }} />
                </div>
              </button>
              {isExpanded && (
                <div style={{ padding:"14px 20px 18px" }}>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {prods.map(prod => (
                      <span key={prod} style={{ background:`${color}10`, border:`1px solid ${color}30`, color, padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, letterSpacing:0.3 }}>
                        {prod}
                      </span>
                    ))}
                    {prods.length === 0 && <p style={{ color:"#9ca3af", fontSize:13, margin:0 }}>Aucun résultat</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── MODAL AJOUTER PRODUIT ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center"><Plus size={16} className="text-green-600" /></div>
                <h3 className="font-bold text-gray-800 text-lg">Ajouter un produit</h3>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {addError   && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-2 text-sm">{addError}</div>}
              {addSuccess && <div className="bg-green-50 text-green-700 border border-green-200 rounded-xl px-4 py-2 text-sm">{addSuccess}</div>}

              {/* Nom */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Nom du produit <span className="text-red-500">*</span></label>
                <input value={addName} onChange={(e) => setAddName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Ex : CEXIME, AZIENT..." />
              </div>

              {/* Laboratoire (super admin peut choisir) */}
              {isSuperAdmin && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Laboratoire <span className="text-red-500">*</span></label>
                  <select value={addLab} onChange={(e) => setAddLab(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                    <option value="croient">CROIENT</option>
                    <option value="lic-pharma">LIC PHARMA</option>
                    {labsList.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                  </select>
                </div>
              )}

              {/* Spécialité */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Spécialité <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mb-2">
                  <button onClick={() => setUseNewSpec(false)}
                    className={`flex-1 py-2 text-sm rounded-xl border transition font-medium ${!useNewSpec ? "bg-green-600 text-white border-green-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    Spécialité existante
                  </button>
                  <button onClick={() => setUseNewSpec(true)}
                    className={`flex-1 py-2 text-sm rounded-xl border transition font-medium ${useNewSpec ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    + Nouvelle spécialité
                  </button>
                </div>
                {!useNewSpec ? (
                  <select value={addSpec} onChange={(e) => setAddSpec(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                    <option value="">-- Sélectionner --</option>
                    {allSpecs.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input value={addNewSpec} onChange={(e) => setAddNewSpec(e.target.value)}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                    placeholder="Nom de la nouvelle spécialité" />
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Annuler</button>
                <button onClick={handleAddProduct} disabled={addProductMut.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-60">
                  {addProductMut.isPending ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AJOUTER LABORATOIRE (Super Admin) ── */}
      {showAddLab && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center"><Layers size={16} className="text-purple-600" /></div>
                <h3 className="font-bold text-gray-800">Nouveau Laboratoire</h3>
              </div>
              <button onClick={() => setShowAddLab(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {labError   && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-2 text-sm mb-3">{labError}</div>}
            {labSuccess && <div className="bg-green-50 text-green-700 border border-green-200 rounded-xl px-4 py-2 text-sm mb-3">{labSuccess}</div>}
            <p className="text-sm text-gray-500 mb-4">Le nouveau labo sera automatiquement disponible dans toutes les fonctionnalités de l'application.</p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Nom du laboratoire <span className="text-red-500">*</span></label>
                <input value={newLabName} onChange={(e) => setNewLabName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                  placeholder="Ex : PHARMADEV, MEDLAB..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Couleur du labo</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={newLabColor} onChange={(e) => setNewLabColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                  <span className="text-sm text-gray-600">Couleur d'interface pour ce labo</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddLab(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Annuler</button>
              <button onClick={() => {
                setLabError(""); setLabSuccess("");
                if (!newLabName.trim()) return setLabError("Le nom est obligatoire");
                addLabMut.mutate({ name: newLabName.trim(), color: newLabColor });
              }} disabled={addLabMut.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-60">
                {addLabMut.isPending ? "Création..." : "Créer le laboratoire"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`input::placeholder { color: rgba(255,255,255,0.5) !important; }`}</style>
    </div>
  );
}
