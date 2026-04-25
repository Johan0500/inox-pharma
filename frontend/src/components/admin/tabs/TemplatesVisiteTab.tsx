import { useState } from "react";
import { Plus, X, Save, Copy, Trash2, FileText, Check, ChevronDown, ChevronUp } from "lucide-react";

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
  createdAt:   string;
}

const TEMPLATES_KEY = "visite_templates";

const DEFAULTS: Template[] = [
  {
    id: "tpl_pharmacie",
    name: "Visite Pharmacie",
    category: "Officine",
    description: "Formulaire standard pour les visites en officine",
    createdAt: new Date().toISOString(),
    fields: [
      { id: "f1", label: "Nom de la pharmacie", type: "text",     required: true,  placeholder: "Ex: Pharmacie du Centre" },
      { id: "f2", label: "Pharmacien rencontré", type: "text",     required: true,  placeholder: "Dr. Nom Prénom" },
      { id: "f3", label: "Produits présentés",   type: "textarea", required: true,  placeholder: "Liste des produits..." },
      { id: "f4", label: "Commande passée",       type: "checkbox", required: false, placeholder: "" },
      { id: "f5", label: "Remarques",             type: "textarea", required: false, placeholder: "Observations..." },
    ],
  },
  {
    id: "tpl_medecin",
    name: "Visite Médecin",
    category: "Corps médical",
    description: "Formulaire pour les visites chez les médecins et spécialistes",
    createdAt: new Date().toISOString(),
    fields: [
      { id: "f1", label: "Nom du médecin",         type: "text",   required: true,  placeholder: "Dr. Nom Prénom" },
      { id: "f2", label: "Spécialité",              type: "select", required: true,  placeholder: "", options: ["Généraliste","Pédiatre","Cardiologue","Gynécologue","Autre"] },
      { id: "f3", label: "Produits discutés",       type: "textarea", required: true, placeholder: "..." },
      { id: "f4", label: "Nombre d'ordonnances/j",  type: "number", required: false, placeholder: "Ex: 20" },
      { id: "f5", label: "Intérêt du médecin",      type: "select", required: false, placeholder: "", options: ["Très intéressé","Intéressé","Neutre","Peu intéressé"] },
      { id: "f6", label: "Prochain RDV",            type: "text",   required: false, placeholder: "Ex: dans 2 semaines" },
    ],
  },
];

function loadTemplates(): Template[] {
  try {
    const stored = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || "null");
    return stored || DEFAULTS;
  } catch { return DEFAULTS; }
}
function saveTemplates(tpls: Template[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(tpls));
}

const FIELD_TYPES = [
  { value: "text",     label: "Texte court" },
  { value: "textarea", label: "Texte long" },
  { value: "number",   label: "Nombre" },
  { value: "select",   label: "Liste déroulante" },
  { value: "checkbox", label: "Case à cocher" },
];

export default function TemplatesVisiteTab() {
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);
  const [editing,   setEditing]   = useState<Template | null>(null);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [saved,     setSaved]     = useState(false);

  const save = (tpls: Template[]) => {
    setTemplates(tpls);
    saveTemplates(tpls);
  };

  const createNew = () => {
    const tpl: Template = {
      id:          `tpl_${Date.now()}`,
      name:        "Nouveau template",
      category:    "Autre",
      description: "",
      fields:      [],
      createdAt:   new Date().toISOString(),
    };
    setEditing(tpl);
  };

  const duplicate = (tpl: Template) => {
    const copy: Template = { ...tpl, id: `tpl_${Date.now()}`, name: tpl.name + " (copie)", createdAt: new Date().toISOString() };
    const updated = [...templates, copy];
    save(updated);
  };

  const remove = (id: string) => {
    save(templates.filter(t => t.id !== id));
  };

  const saveEditing = () => {
    if (!editing) return;
    const exists = templates.find(t => t.id === editing.id);
    save(exists ? templates.map(t => t.id === editing.id ? editing : t) : [...templates, editing]);
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addField = () => {
    if (!editing) return;
    setEditing({ ...editing, fields: [...editing.fields, { id: `f_${Date.now()}`, label: "", type: "text", required: false, placeholder: "" }] });
  };

  const updateField = (id: string, patch: Partial<TemplateField>) => {
    if (!editing) return;
    setEditing({ ...editing, fields: editing.fields.map(f => f.id === id ? { ...f, ...patch } : f) });
  };

  const removeField = (id: string) => {
    if (!editing) return;
    setEditing({ ...editing, fields: editing.fields.filter(f => f.id !== id) });
  };

  const CATEGORY_COLORS: Record<string, string> = {
    "Officine": "#0284c7", "Corps médical": "#7c3aed", "Hôpital": "#be185d", "Autre": "#64748b",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#be185d,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FileText size={22} color="white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Templates de visite</h2>
            <p className="text-xs text-gray-400">{templates.length} template(s) disponible(s)</p>
          </div>
        </div>
        <button onClick={createNew}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-pink-600 text-white font-semibold hover:bg-pink-700 transition">
          <Plus size={14} /> Nouveau
        </button>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-700 text-sm flex items-center gap-2">
          <Check size={14} /> Template sauvegardé avec succès
        </div>
      )}

      {/* Liste templates */}
      {!editing && (
        <div className="space-y-3">
          {templates.map(tpl => {
            const isExpanded = expanded === tpl.id;
            const catColor   = CATEGORY_COLORS[tpl.category] || "#64748b";
            return (
              <div key={tpl.id} style={{ background: "white", border: "1.5px solid #e5e7eb", borderRadius: 16 }}>
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "#111827" }}>{tpl.name}</p>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: catColor+"22", color: catColor, fontWeight: 600 }}>{tpl.category}</span>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{tpl.fields.length} champ(s)</span>
                    </div>
                    {tpl.description && <p style={{ fontSize: 12, color: "#9ca3af", margin: "3px 0 0" }}>{tpl.description}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setExpanded(isExpanded ? null : tpl.id)}
                      style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#374151" }}>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button onClick={() => setEditing(tpl)}
                      style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#2563eb", fontSize: 12, fontWeight: 600 }}>
                      Modifier
                    </button>
                    <button onClick={() => duplicate(tpl)}
                      style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#374151" }}>
                      <Copy size={12} />
                    </button>
                    <button onClick={() => remove(tpl.id)}
                      style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#dc2626" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid #f3f4f6", padding: "12px 16px" }}>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Champs du formulaire :</p>
                    <div className="space-y-1">
                      {tpl.fields.map((f, i) => (
                        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}>
                          <span style={{ color: "#9ca3af", minWidth: 18 }}>{i+1}.</span>
                          <span style={{ fontWeight: 600 }}>{f.label || "(sans label)"}</span>
                          <span style={{ color: "#9ca3af" }}>— {FIELD_TYPES.find(t => t.value === f.type)?.label}</span>
                          {f.required && <span style={{ color: "#dc2626", fontSize: 10 }}>*</span>}
                        </div>
                      ))}
                      {tpl.fields.length === 0 && <p style={{ fontSize: 12, color: "#9ca3af" }}>Aucun champ configuré</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Éditeur de template */}
      {editing && (
        <div style={{ background: "white", borderRadius: 20, border: "2px solid #fbcfe8", padding: "20px" }} className="space-y-4">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Édition du template</p>
            <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={18} /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Nom *</label>
              <input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})}
                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Catégorie</label>
              <input value={editing.category} onChange={e => setEditing({...editing, category: e.target.value})}
                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="Ex: Officine, Corps médical…" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
            <input value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})}
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400" placeholder="Description courte…" />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p className="text-xs font-semibold text-gray-500">Champs du formulaire</p>
              <button onClick={addField} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#be185d", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                <Plus size={12} /> Ajouter un champ
              </button>
            </div>
            <div className="space-y-3">
              {editing.fields.map((field, i) => (
                <div key={field.id} style={{ background: "#fdf2f8", borderRadius: 12, padding: "12px 14px" }}>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input value={field.label} onChange={e => updateField(field.id, { label: e.target.value })}
                      placeholder="Label du champ *"
                      className="border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-pink-400" />
                    <select value={field.type} onChange={e => updateField(field.id, { type: e.target.value as any })}
                      className="border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-pink-400 bg-white">
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <input value={field.placeholder} onChange={e => updateField(field.id, { placeholder: e.target.value })}
                      placeholder="Placeholder…"
                      className="flex-1 border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-pink-400" />
                    <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} className="accent-pink-600" />
                      Requis
                    </label>
                    <button onClick={() => removeField(field.id)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>
                      <X size={14} />
                    </button>
                  </div>
                  {field.type === "select" && (
                    <input value={field.options?.join(", ") || ""} onChange={e => updateField(field.id, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      placeholder="Options séparées par des virgules"
                      className="mt-2 w-full border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-pink-400" />
                  )}
                </div>
              ))}
              {editing.fields.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                  Cliquez sur "Ajouter un champ" pour commencer
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
            <button onClick={() => setEditing(null)}
              style={{ flex: 1, padding: "12px 0", borderRadius: 14, background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
              Annuler
            </button>
            <button onClick={saveEditing}
              style={{ flex: 2, padding: "12px 0", borderRadius: 14, background: "linear-gradient(135deg,#be185d,#ec4899)", border: "none", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Save size={16} /> Sauvegarder le template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}