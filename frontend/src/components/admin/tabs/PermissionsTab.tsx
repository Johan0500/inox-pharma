import { useState }    from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Check, Save, Loader } from "lucide-react";
import api from "../../../services/api";

const ALL_PERMS = [
  { id:"view_gps",            label:"Voir la carte GPS",            desc:"Positions temps réel",               group:"GPS & Terrain" },
  { id:"view_gps_history",    label:"Voir l'historique GPS",        desc:"Trajets des jours précédents",       group:"GPS & Terrain" },
  { id:"view_reports",        label:"Voir les rapports",            desc:"Lire les rapports hebdomadaires",    group:"Rapports" },
  { id:"validate_reports",    label:"Valider les rapports",         desc:"Approuver ou rejeter",               group:"Rapports" },
  { id:"export_pdf",          label:"Exporter en PDF",              desc:"Télécharger les rapports PDF",       group:"Rapports" },
  { id:"export_excel",        label:"Exporter en Excel/CSV",        desc:"Télécharger les données tableur",    group:"Rapports" },
  { id:"view_objectives",     label:"Voir les objectifs CA",        desc:"Tableaux de bord CA",                group:"Objectifs" },
  { id:"edit_objectives",     label:"Modifier les objectifs CA",    desc:"Définir et modifier les cibles",     group:"Objectifs" },
  { id:"manage_delegates",    label:"Gérer les délégués",           desc:"Créer/modifier/désactiver",          group:"Utilisateurs" },
  { id:"delete_users",        label:"Supprimer des utilisateurs",   desc:"Suppression définitive",             group:"Utilisateurs" },
  { id:"send_notifications",  label:"Envoyer des notifications",    desc:"Push notifications",                 group:"Communication" },
  { id:"view_login_history",  label:"Voir l'historique connexions", desc:"Audit des connexions",               group:"Sécurité" },
  { id:"manage_planning",     label:"Gérer le planning",            desc:"Créer et modifier les plannings",    group:"Planning" },
  { id:"view_chiffres",       label:"Voir les chiffres de vente",   desc:"Rapports de ventes grossistes",      group:"Chiffres" },
  { id:"edit_chiffres",       label:"Saisir les chiffres",          desc:"Renseigner les ventes grossistes",   group:"Chiffres" },
];

const DEFAULT_PERMS = [
  "view_gps","view_gps_history","view_reports","validate_reports","export_pdf",
  "view_objectives","edit_objectives","manage_delegates","send_notifications",
  "manage_planning","view_chiffres","edit_chiffres"
];

const GROUPS = Array.from(new Set(ALL_PERMS.map(p => p.group)));

export default function PermissionsTab() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localPerms, setLocalPerms]  = useState<string[]>([]);
  const [saved,      setSaved]       = useState(false);

  // Charger la liste des admins
  const { data: users = [] } = useQuery({
    queryKey: ["users-perms"],
    queryFn:  () => api.get("/users").then(r => r.data),
    staleTime: 30000,
  });
  const admins = (users as any[]).filter((u:any) => u.role === "ADMIN");

  // Charger les permissions de l'admin sélectionné
  const { data: permData, isLoading: loadingPerms } = useQuery({
    queryKey: ["user-permissions", selectedId],
    queryFn:  () => api.get(`/users/${selectedId}/permissions`).then(r => r.data),
    enabled:  !!selectedId,
    onSuccess: (data:any) => {
      setLocalPerms(data.permissions?.length > 0 ? data.permissions : DEFAULT_PERMS);
    },
  } as any);

  // Sauvegarder les permissions
  const saveMut = useMutation({
    mutationFn: (perms: string[]) =>
      api.put(`/users/${selectedId}/permissions`, { permissions: perms }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-permissions", selectedId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const selectAdmin = (id: string) => {
    setSelectedId(id);
    setSaved(false);
  };

  const toggle = (permId: string) => {
    setLocalPerms(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const selectedAdmin = admins.find((a:any) => a.id === selectedId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#7c3aed,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Shield size={22} color="white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Gestion des permissions</h2>
          <p className="text-xs text-gray-400">Les changements sont appliqués immédiatement sur le compte de l'admin</p>
        </div>
      </div>

      <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>

        {/* Liste admins */}
        <div style={{ flex:"0 0 200px", minWidth:180 }}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Administrateurs</p>
          {admins.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucun admin</p>
          ) : (
            <div className="space-y-2">
              {admins.map((admin:any) => (
                <button key={admin.id} onClick={() => selectAdmin(admin.id)}
                  style={{ width:"100%", background: selectedId===admin.id ? "#ede9fe" : "white", border:`1.5px solid ${selectedId===admin.id ? "#7c3aed" : "#e5e7eb"}`, borderRadius:14, padding:"10px 12px", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
                  <p style={{ fontWeight:700, fontSize:13, color:"#111827", margin:0 }}>{admin.firstName} {admin.lastName}</p>
                  <p style={{ fontSize:10, color:"#9ca3af", margin:"2px 0 0" }}>
                    {admin.adminLabs?.map((l:any) => l.laboratory?.name).join(", ") || "Aucun labo"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Permissions */}
        <div style={{ flex:1, minWidth:280 }}>
          {!selectedId ? (
            <div style={{ background:"#faf5ff", border:"2px dashed #e9d5ff", borderRadius:16, padding:"32px", textAlign:"center" }}>
              <Shield size={32} color="#c4b5fd" style={{ margin:"0 auto 10px" }} />
              <p style={{ color:"#7c3aed", fontWeight:600 }}>Sélectionnez un admin</p>
              <p style={{ fontSize:12, color:"#a78bfa" }}>pour configurer ses permissions</p>
            </div>
          ) : loadingPerms ? (
            <div className="text-center py-8 text-gray-400">Chargement…</div>
          ) : (
            <div className="space-y-3">
              {/* Actions rapides */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                <p style={{ fontWeight:700, fontSize:14, color:"#111827" }}>
                  {selectedAdmin?.firstName} {selectedAdmin?.lastName}
                </p>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => setLocalPerms(ALL_PERMS.map(p => p.id))}
                    style={{ fontSize:11, padding:"5px 10px", borderRadius:8, background:"#ede9fe", color:"#7c3aed", border:"none", cursor:"pointer", fontWeight:600 }}>
                    Tout activer
                  </button>
                  <button onClick={() => setLocalPerms([])}
                    style={{ fontSize:11, padding:"5px 10px", borderRadius:8, background:"#fee2e2", color:"#dc2626", border:"none", cursor:"pointer", fontWeight:600 }}>
                    Tout retirer
                  </button>
                  <button onClick={() => setLocalPerms(DEFAULT_PERMS)}
                    style={{ fontSize:11, padding:"5px 10px", borderRadius:8, background:"#f3f4f6", color:"#374151", border:"none", cursor:"pointer", fontWeight:600 }}>
                    Par défaut
                  </button>
                </div>
              </div>

              {/* Groupes de permissions */}
              {GROUPS.map(group => (
                <div key={group} style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:14, overflow:"hidden" }}>
                  <div style={{ background:"#f9fafb", padding:"8px 14px", borderBottom:"1px solid #e5e7eb" }}>
                    <p style={{ fontSize:11, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.05em", margin:0 }}>{group}</p>
                  </div>
                  {ALL_PERMS.filter(p => p.group === group).map((perm, i, arr) => {
                    const active = localPerms.includes(perm.id);
                    return (
                      <div key={perm.id}
                        style={{ display:"flex", alignItems:"center", padding:"10px 14px", borderBottom: i < arr.length-1 ? "1px solid #f3f4f6" : "none", gap:10 }}>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:13, fontWeight:600, color:"#111827", margin:0 }}>{perm.label}</p>
                          <p style={{ fontSize:11, color:"#9ca3af", margin:0 }}>{perm.desc}</p>
                        </div>
                        {/* Toggle switch */}
                        <button onClick={() => toggle(perm.id)}
                          style={{ width:36, height:20, borderRadius:99, border:"none", cursor:"pointer", background: active ? "#7c3aed" : "#e5e7eb", transition:"background 0.2s", position:"relative", flexShrink:0 }}>
                          <span style={{ position:"absolute", top:2, left: active ? 18 : 2, width:16, height:16, borderRadius:"50%", background:"white", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Bouton sauvegarder */}
              {saved ? (
                <div style={{ background:"#d1fae5", border:"1px solid #6ee7b7", borderRadius:14, padding:"12px", display:"flex", alignItems:"center", justifyContent:"center", gap:8, color:"#065f46", fontWeight:700 }}>
                  <Check size={16} /> Permissions appliquées avec succès !
                </div>
              ) : (
                <button
                  onClick={() => saveMut.mutate(localPerms)}
                  disabled={saveMut.isPending}
                  style={{ width:"100%", padding:"13px", borderRadius:14, background:"linear-gradient(135deg,#7c3aed,#8b5cf6)", border:"none", color:"white", fontWeight:700, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  {saveMut.isPending
                    ? <><Loader size={16} style={{ animation:"spin 1s linear infinite" }} /> Sauvegarde…</>
                    : <><Save size={16} /> Appliquer les permissions</>
                  }
                </button>
              )}

              <p style={{ fontSize:11, color:"#9ca3af", textAlign:"center" }}>
                {localPerms.length}/{ALL_PERMS.length} permissions actives · Effet immédiat sur le compte de l'admin
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}