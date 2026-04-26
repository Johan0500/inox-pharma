import { useState } from "react";
import { Plus, X, Save, Copy, Trash2, FileText, Check, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";

interface TemplateField {
  id:          string;
  label:       string;
  type:        "text" | "number" | "select" | "textarea" | "checkbox";
  options?:    string[];
  required:    boolean;
  placeholder: string;
}

interface Template {
  id:          string;
  name:        string;
  category:    string;
  description: string;
  fields:      TemplateField[];
  isReport:    boolean;   // ← true = rapport à part entière visible par le délégué
  emoji:       string;    // ← icône affichée chez le délégué
  createdAt:   string;
}

const TEMPLATES_KEY = "visite_templates";

const DEFAULTS: Template[] = [
  {
    id: "tpl_pharmacie", name: "Visite Pharmacie", category: "Officine",
    description: "Formulaire pour les visites en officine", emoji: "🏪",
    isReport: true, createdAt: new Date().toISOString(),
    fields: [
      { id:"f1", label:"Nom de la pharmacie",  type:"text",     required:true,  placeholder:"Ex: Pharmacie du Centre" },
      { id:"f2", label:"Pharmacien rencontré", type:"text",     required:true,  placeholder:"Dr. Nom Prénom" },
      { id:"f3", label:"Produits présentés",   type:"textarea", required:true,  placeholder:"Liste des produits..." },
      { id:"f4", label:"Commande passée",       type:"checkbox", required:false, placeholder:"Oui" },
      { id:"f5", label:"Remarques",             type:"textarea", required:false, placeholder:"Observations..." },
    ],
  },
  {
    id: "tpl_medecin", name: "Visite Médecin", category: "Corps médical",
    description: "Formulaire pour les visites chez les médecins", emoji: "👨‍⚕️",
    isReport: true, createdAt: new Date().toISOString(),
    fields: [
      { id:"f1", label:"Nom du médecin",        type:"text",   required:true,  placeholder:"Dr. Nom Prénom" },
      { id:"f2", label:"Spécialité",             type:"select", required:true,  placeholder:"", options:["Généraliste","Pédiatre","Cardiologue","Gynécologue","Autre"] },
      { id:"f3", label:"Produits discutés",      type:"textarea", required:true, placeholder:"..." },
      { id:"f4", label:"Nombre ordonnances/j",   type:"number", required:false, placeholder:"Ex: 20" },
      { id:"f5", label:"Intérêt du médecin",     type:"select", required:false, placeholder:"", options:["Très intéressé","Intéressé","Neutre","Peu intéressé"] },
      { id:"f6", label:"Prochain RDV",           type:"text",   required:false, placeholder:"Ex: dans 2 semaines" },
    ],
  },
];

function loadTemplates(): Template[] {
  try {
    const s = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || "null");
    if (s) return s;
    // Premier chargement → sauvegarder les défauts
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULTS));
    return DEFAULTS;
  } catch { return DEFAULTS; }
}
function saveTemplates(t: Template[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t));
}

const FIELD_TYPES = [
  { value:"text",     label:"Texte court"       },
  { value:"textarea", label:"Texte long"        },
  { value:"number",   label:"Nombre"            },
  { value:"select",   label:"Liste déroulante"  },
  { value:"checkbox", label:"Case à cocher"     },
];

const EMOJIS = ["📋","🏪","👨‍⚕️","🏥","💊","🔬","📊","🧪","🏢","📝"];

export default function TemplatesVisiteTab() {
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);
  const [editing,   setEditing]   = useState<Template | null>(null);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [saved,     setSaved]     = useState(false);

  const save = (tpls: Template[]) => { setTemplates(tpls); saveTemplates(tpls); };

  const createNew = () => {
    const tpl: Template = {
      id: `tpl_${Date.now()}`, name: "Nouveau rapport", category: "Autre",
      description: "", fields: [], isReport: true, emoji: "📋",
      createdAt: new Date().toISOString(),
    };
    setEditing(tpl);
  };

  const duplicate = (tpl: Template) => {
    const copy: Template = { ...tpl, id:`tpl_${Date.now()}`, name:`${tpl.name} (copie)`, createdAt: new Date().toISOString() };
    save([...templates, copy]);
  };

  const remove = (id: string) => save(templates.filter(t => t.id !== id));

  const saveEditing = () => {
    if (!editing) return;
    const exists = templates.find(t => t.id === editing.id);
    save(exists ? templates.map(t => t.id === editing.id ? editing : t) : [...templates, editing]);
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addField = () => {
    if (!editing) return;
    setEditing({ ...editing, fields: [...editing.fields, { id:`f_${Date.now()}`, label:"", type:"text", required:false, placeholder:"" }] });
  };

  const updateField = (id: string, patch: Partial<TemplateField>) => {
    if (!editing) return;
    setEditing({ ...editing, fields: editing.fields.map(f => f.id === id ? { ...f, ...patch } : f) });
  };

  const removeField = (id: string) => {
    if (!editing) return;
    setEditing({ ...editing, fields: editing.fields.filter(f => f.id !== id) });
  };

  const moveField = (id: string, dir: -1 | 1) => {
    if (!editing) return;
    const idx = editing.fields.findIndex(f => f.id === id);
    if (idx < 0) return;
    const fields = [...editing.fields];
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    [fields[idx], fields[target]] = [fields[target], fields[idx]];
    setEditing({ ...editing, fields });
  };

  const reportTemplates = templates.filter(t => t.isReport);
  const extraTemplates  = templates.filter(t => !t.isReport);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#be185d,#ec4899)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ClipboardList size={22} color="white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Templates de rapport</h2>
            <p className="text-xs text-gray-400">
              {reportTemplates.length} rapport(s) visible(s) par les délégués · {extraTemplates.length} template(s) complémentaire(s)
            </p>
          </div>
        </div>
        <button onClick={createNew}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-pink-600 text-white font-semibold hover:bg-pink-700 transition">
          <Plus size={14} /> Nouveau
        </button>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-700 text-sm flex items-center gap-2">
          <Check size={14} /> Template sauvegardé — visible immédiatement chez les délégués
        </div>
      )}

      {/* Explication */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs font-semibold text-blue-700 mb-1">💡 Comment ça marche</p>
        <p className="text-xs text-blue-600">
          Les templates marqués <strong>"Rapport délégué"</strong> apparaissent dans l'onglet Rapport du délégué comme un nouveau type de rapport à remplir.
          Les autres templates sont des compléments optionnels au rapport hebdomadaire.
        </p>
      </div>

      {/* Liste templates */}
      {!editing && (
        <div className="space-y-2">
          {templates.length === 0 && (
            <div className="text-center py-12 text-gray-300 border-2 border-dashed border-gray-200 rounded-2xl">
              <ClipboardList size={36} className="mx-auto mb-2" />
              <p className="text-gray-400">Aucun template créé</p>
            </div>
          )}
          {templates.map(tpl => {
            const isExp = expanded === tpl.id;
            return (
              <div key={tpl.id} style={{ background:"white", border:`1.5px solid ${tpl.isReport ? "#fbcfe8" : "#e5e7eb"}`, borderRadius:16 }}>
                <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:22, flexShrink:0 }}>{tpl.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <p style={{ fontWeight:700, fontSize:14, margin:0, color:"#111827" }}>{tpl.name}</p>
                      {tpl.isReport && (
                        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"#fce7f3", color:"#be185d", fontWeight:700 }}>
                          📄 Rapport délégué
                        </span>
                      )}
                      <span style={{ fontSize:10, color:"#9ca3af" }}>{tpl.category} · {tpl.fields.length} champ(s)</span>
                    </div>
                    {tpl.description && <p style={{ fontSize:11, color:"#9ca3af", margin:"2px 0 0" }}>{tpl.description}</p>}
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={() => setExpanded(isExp ? null : tpl.id)}
                      style={{ background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:8, padding:"5px 8px", cursor:"pointer", color:"#6b7280" }}>
                      {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button onClick={() => setEditing(JSON.parse(JSON.stringify(tpl)))}
                      style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"5px 10px", cursor:"pointer", color:"#2563eb", fontSize:12, fontWeight:600 }}>
                      Modifier
                    </button>
                    <button onClick={() => duplicate(tpl)}
                      style={{ background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:8, padding:"5px 8px", cursor:"pointer", color:"#6b7280" }}>
                      <Copy size={12} />
                    </button>
                    <button onClick={() => remove(tpl.id)}
                      style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"5px 8px", cursor:"pointer", color:"#dc2626" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {isExp && (
                  <div style={{ borderTop:"1px solid #f3f4f6", padding:"10px 16px" }}>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Champs :</p>
                    {tpl.fields.map((f, i) => (
                      <div key={f.id} style={{ fontSize:12, color:"#374151", marginBottom:3, display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ color:"#9ca3af", minWidth:18 }}>{i+1}.</span>
                        <span style={{ fontWeight:600 }}>{f.label || "(sans nom)"}</span>
                        <span style={{ color:"#9ca3af" }}>— {FIELD_TYPES.find(t => t.value === f.type)?.label}</span>
                        {f.required && <span style={{ color:"#dc2626", fontSize:10 }}>*requis</span>}
                      </div>
                    ))}
                    {tpl.fields.length === 0 && <p style={{ fontSize:12, color:"#9ca3af" }}>Aucun champ</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Éditeur */}
      {editing && (
        <div style={{ background:"white", borderRadius:20, border:"2px solid #fbcfe8", padding:20 }} className="space-y-4">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <p style={{ fontWeight:700, fontSize:16, color:"#111827" }}>
              {templates.find(t => t.id === editing.id) ? "Modifier" : "Créer"} un template
            </p>
            <button onClick={() => setEditing(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af" }}><X size={18} /></button>
          </div>

          {/* Toggle rapport délégué */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background: editing.isReport ? "#fce7f3" : "#f9fafb", borderRadius:12, border:`1.5px solid ${editing.isReport ? "#f9a8d4" : "#e5e7eb"}` }}>
            <div>
              <p style={{ fontWeight:700, fontSize:13, color:"#111827", margin:0 }}>Rapport délégué</p>
              <p style={{ fontSize:11, color:"#9ca3af", margin:"2px 0 0" }}>
                {editing.isReport ? "✅ Visible dans l'onglet Rapport du délégué" : "Complément optionnel au rapport hebdomadaire"}
              </p>
            </div>
            <button onClick={() => setEditing({ ...editing, isReport: !editing.isReport })}
              style={{ width:40, height:22, borderRadius:99, border:"none", cursor:"pointer", background: editing.isReport ? "#be185d" : "#e5e7eb", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
              <span style={{ position:"absolute", top:3, left: editing.isReport ? 20 : 3, width:16, height:16, borderRadius:"50%", background:"white", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
            </button>
          </div>

          {/* Emoji + Nom + Catégorie */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Icône</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setEditing({ ...editing, emoji: e })}
                    style={{ width:36, height:36, borderRadius:10, border:`2px solid ${editing.emoji===e ? "#be185d" : "#e5e7eb"}`, background: editing.emoji===e ? "#fce7f3" : "white", fontSize:18, cursor:"pointer" }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Nom du rapport *</label>
                <input value={editing.name} onChange={e => setEditing({...editing, name:e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Catégorie</label>
                <input value={editing.category} onChange={e => setEditing({...editing, category:e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="Ex: Officine, Corps médical…" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Description courte</label>
              <input value={editing.description} onChange={e => setEditing({...editing, description:e.target.value})}
                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="Visible par le délégué sous le nom du rapport" />
            </div>
          </div>

          {/* Champs */}
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <p className="text-xs font-semibold text-gray-500">Champs du formulaire ({editing.fields.length})</p>
              <button onClick={addField} style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"#be185d", fontWeight:600, background:"none", border:"none", cursor:"pointer" }}>
                <Plus size={12} /> Ajouter un champ
              </button>
            </div>
            <div className="space-y-3">
              {editing.fields.map((field, i) => (
                <div key={field.id} style={{ background:"#fdf2f8", borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                    <span style={{ fontSize:11, color:"#9ca3af", minWidth:20 }}>#{i+1}</span>
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <input value={field.label} onChange={e => updateField(field.id, {label:e.target.value})}
                        placeholder="Label du champ *"
                        className="border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-pink-400" />
                      <select value={field.type} onChange={e => updateField(field.id, {type:e.target.value as any})}
                        className="border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-pink-400 bg-white">
                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                      <button onClick={() => moveField(field.id, -1)} disabled={i===0}
                        style={{ background:"none", border:"1px solid #e5e7eb", borderRadius:6, padding:"3px 6px", cursor:"pointer", color:"#6b7280", opacity:i===0?0.3:1 }}>↑</button>
                      <button onClick={() => moveField(field.id, 1)} disabled={i===editing.fields.length-1}
                        style={{ background:"none", border:"1px solid #e5e7eb", borderRadius:6, padding:"3px 6px", cursor:"pointer", color:"#6b7280", opacity:i===editing.fields.length-1?0.3:1 }}>↓</button>
                      <button onClick={() => removeField(field.id)}
                        style={{ background:"#fee2e2", border:"none", borderRadius:6, padding:"3px 6px", cursor:"pointer", color:"#dc2626" }}><X size={11} /></button>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input value={field.placeholder} onChange={e => updateField(field.id, {placeholder:e.target.value})}
                      placeholder="Placeholder / texte d'aide…"
                      className="flex-1 border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-pink-400" />
                    <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#6b7280", cursor:"pointer", flexShrink:0 }}>
                      <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, {required:e.target.checked})} className="accent-pink-600" />
                      Requis
                    </label>
                  </div>
                  {field.type === "select" && (
                    <input value={field.options?.join(", ") || ""} onChange={e => updateField(field.id, {options:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})}
                      placeholder="Options séparées par des virgules"
                      className="mt-2 w-full border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-pink-400" />
                  )}
                </div>
              ))}
              {editing.fields.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                  Cliquez "Ajouter un champ" pour commencer
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setEditing(null)}
              style={{ flex:1, padding:"12px 0", borderRadius:14, background:"#f9fafb", border:"1px solid #e5e7eb", color:"#374151", fontWeight:600, cursor:"pointer", fontSize:14 }}>
              Annuler
            </button>
            <button onClick={saveEditing}
              style={{ flex:2, padding:"12px 0", borderRadius:14, background:"linear-gradient(135deg,#be185d,#ec4899)", border:"none", color:"white", fontWeight:700, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <Save size={16} /> Sauvegarder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}