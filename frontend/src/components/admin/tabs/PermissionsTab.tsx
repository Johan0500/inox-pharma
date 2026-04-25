import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Check, X, Save, ChevronDown, Lock, Eye, Edit, Trash2, Download, Bell } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";

const PERMS_KEY = "admin_permissions";

interface Permission {
  id:      string;
  label:   string;
  desc:    string;
  icon:    React.ReactNode;
  group:   string;
}

const ALL_PERMS: Permission[] = [
  { id: "view_gps",           label: "Voir la carte GPS",           desc: "Accès temps réel aux positions",       icon: <Eye size={13} />,      group: "GPS & Terrain" },
  { id: "view_gps_history",   label: "Voir l'historique GPS",       desc: "Trajets des jours précédents",         icon: <Eye size={13} />,      group: "GPS & Terrain" },
  { id: "view_reports",       label: "Voir les rapports",           desc: "Lire les rapports hebdomadaires",      icon: <Eye size={13} />,      group: "Rapports" },
  { id: "validate_reports",   label: "Valider les rapports",        desc: "Approuver ou rejeter les rapports",    icon: <Check size={13} />,    group: "Rapports" },
  { id: "export_pdf",         label: "Exporter en PDF",             desc: "Télécharger les rapports PDF",         icon: <Download size={13} />, group: "Rapports" },
  { id: "export_excel",       label: "Exporter en Excel/CSV",       desc: "Télécharger les données tableur",      icon: <Download size={13} />, group: "Rapports" },
  { id: "view_objectives",    label: "Voir les objectifs CA",       desc: "Accès aux tableaux de bord CA",        icon: <Eye size={13} />,      group: "Objectifs" },
  { id: "edit_objectives",    label: "Modifier les objectifs CA",   desc: "Définir et modifier les cibles",       icon: <Edit size={13} />,     group: "Objectifs" },
  { id: "manage_delegates",   label: "Gérer les délégués",          desc: "Créer/modifier/désactiver délégués",   icon: <Edit size={13} />,     group: "Utilisateurs" },
  { id: "manage_admins",      label: "Gérer les admins",            desc: "Créer/modifier des administrateurs",   icon: <Shield size={13} />,   group: "Utilisateurs" },
  { id: "delete_users",       label: "Supprimer des utilisateurs",  desc: "Suppression définitive",               icon: <Trash2 size={13} />,   group: "Utilisateurs" },
  { id: "send_notifications", label: "Envoyer des notifications",   desc: "Push notifications aux délégués",      icon: <Bell size={13} />,     group: "Communication" },
  { id: "view_login_history", label: "Voir l'historique connexions",desc: "Audit des connexions",                 icon: <Eye size={13} />,      group: "Sécurité" },
  { id: "manage_planning",    label: "Gérer le planning",           desc: "Créer et modifier les plannings",      icon: <Edit size={13} />,     group: "Planning" },
  { id: "view_chiffres",      label: "Voir les chiffres de vente",  desc: "Accès aux rapports de ventes grossistes", icon: <Eye size={13} />, group: "Chiffres" },
  { id: "edit_chiffres",      label: "Saisir les chiffres",         desc: "Renseigner les ventes grossistes",     icon: <Edit size={13} />,     group: "Chiffres" },
];

const DEFAULT_ADMIN_PERMS = ["view_gps","view_gps_history","view_reports","validate_reports","export_pdf","view_objectives","edit_objectives","manage_delegates","send_notifications","manage_planning","view_chiffres","edit_chiffres"];

interface AdminPerms { [adminId: string]: string[] }

function loadPerms(): AdminPerms {
  try { return JSON.parse(localStorage.getItem(PERMS_KEY) || "{}"); } catch { return {}; }
}
function savePerms(p: AdminPerms) {
  localStorage.setItem(PERMS_KEY, JSON.stringify(p));
}

export default function PermissionsTab() {
  const { user: me } = useAuth();
  const [permsMap,  setPermsMap]  = useState<AdminPerms>(loadPerms);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [saved,     setSaved]     = useState<string | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ["users-permissions"],
    queryFn:  () => api.get("/users").then(r => r.data),
    staleTime: 60000,
  });

  const admins = (users as any[]).filter((u: any) => u.role === "ADMIN");

  const getPerms = (adminId: string): string[] => permsMap[adminId] ?? DEFAULT_ADMIN_PERMS;

  const togglePerm = (adminId: string, permId: string) => {
    const current = getPerms(adminId);
    const updated  = current.includes(permId) ? current.filter(p => p !== permId) : [...current, permId];
    const newMap   = { ...permsMap, [adminId]: updated };
    setPermsMap(newMap);
    savePerms(newMap);
  };

  const grantAll = (adminId: string) => {
    const newMap = { ...permsMap, [adminId]: ALL_PERMS.map(p => p.id) };
    setPermsMap(newMap);
    savePerms(newMap);
  };

  const resetDefault = (adminId: string) => {
    const newMap = { ...permsMap, [adminId]: DEFAULT_ADMIN_PERMS };
    setPermsMap(newMap);
    savePerms(newMap);
  };

  const groups = Array.from(new Set(ALL_PERMS.map(p => p.group)));
  const selectedAdmin = admins.find((a: any) => a.id === selected);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Shield size={22} color="white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Gestion des permissions</h2>
          <p className="text-xs text-gray-400">Contrôle fin des accès par administrateur</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Liste admins */}
        <div style={{ flex: "0 0 200px", minWidth: 180 }}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Administrateurs</p>
          {admins.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun admin trouvé</p>
          ) : (
            <div className="space-y-2">
              {admins.map((admin: any) => {
                const perms = getPerms(admin.id);
                return (
                  <button key={admin.id} onClick={() => setSelected(admin.id)}
                    style={{ width: "100%", background: selected === admin.id ? "#ede9fe" : "white", border: `1.5px solid ${selected === admin.id ? "#7c3aed" : "#e5e7eb"}`, borderRadius: 14, padding: "10px 12px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: "#111827", margin: 0 }}>{admin.firstName} {admin.lastName}</p>
                    <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>{perms.length}/{ALL_PERMS.length} permissions</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Permissions */}
        <div style={{ flex: 1, minWidth: 280 }}>
          {!selected ? (
            <div style={{ background: "#faf5ff", border: "2px dashed #e9d5ff", borderRadius: 16, padding: "32px", textAlign: "center" }}>
              <Shield size={32} color="#c4b5fd" style={{ margin: "0 auto 10px" }} />
              <p style={{ color: "#7c3aed", fontWeight: 600, fontSize: 14 }}>Sélectionnez un admin</p>
              <p style={{ fontSize: 12, color: "#a78bfa" }}>pour configurer ses permissions</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                  {selectedAdmin?.firstName} {selectedAdmin?.lastName}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => grantAll(selected!)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 8, background: "#ede9fe", color: "#7c3aed", border: "none", cursor: "pointer", fontWeight: 600 }}>
                    Tout activer
                  </button>
                  <button onClick={() => resetDefault(selected!)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 8, background: "#f3f4f6", color: "#374151", border: "none", cursor: "pointer", fontWeight: 600 }}>
                    Par défaut
                  </button>
                </div>
              </div>

              {groups.map(group => (
                <div key={group} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ background: "#f9fafb", padding: "8px 14px", borderBottom: "1px solid #e5e7eb" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{group}</p>
                  </div>
                  <div>
                    {ALL_PERMS.filter(p => p.group === group).map((perm, i, arr) => {
                      const active = getPerms(selected!).includes(perm.id);
                      return (
                        <div key={perm.id} style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: i < arr.length-1 ? "1px solid #f3f4f6" : "none", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                              <span style={{ color: active ? "#7c3aed" : "#9ca3af" }}>{perm.icon}</span>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{perm.label}</p>
                            </div>
                            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{perm.desc}</p>
                          </div>
                          <button onClick={() => togglePerm(selected!, perm.id)}
                            style={{ width: 36, height: 20, borderRadius: 99, border: "none", cursor: "pointer", background: active ? "#7c3aed" : "#e5e7eb", transition: "background 0.2s", position: "relative", flexShrink: 0 }}>
                            <span style={{ position: "absolute", top: 2, left: active ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
                Les permissions sont sauvegardées automatiquement
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}