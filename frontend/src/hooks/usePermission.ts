import { useEffect } from "react";
import { useQuery }  from "@tanstack/react-query";
import { useAuth }   from "../contexts/AuthContext";
import api           from "../services/api";

// Permissions accordées par défaut à un NOUVEL admin (superadmin n'a pas encore configuré)
// On met volontairement peu de perms par défaut — le superadmin doit les activer
const DEFAULT_ADMIN_PERMS: string[] = [
  "view_reports",
  "view_gps",
  "view_objectives",
  "view_chiffres",
];

export function usePermission() {
  const { user, updateUser } = useAuth();

  // Recharger les permissions depuis le serveur toutes les 30 secondes
  // → effet quasi immédiat quand le superadmin change une permission
  const { data: serverPerms } = useQuery<string[]>({
    queryKey:        ["my-permissions", user?.id],
    queryFn:         () =>
      api.get(`/users/${user!.id}/permissions`).then(r => r.data.permissions as string[]),
    enabled:         !!user && user.role === "ADMIN",
    refetchInterval: 30_000,   // re-vérifie toutes les 30s
    staleTime:       20_000,
    onSuccess: (perms: string[]) => {
      // Mettre à jour le user en mémoire ET localStorage
      if (JSON.stringify(perms) !== JSON.stringify(user?.permissions)) {
        updateUser({ permissions: perms });
      }
    },
  } as any);

  function hasPerm(perm: string): boolean {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;
    if (user.role === "DELEGATE")    return false;

    // Utiliser les perms serveur si disponibles, sinon celles du localStorage
    const perms = serverPerms ?? user.permissions;

    // Si AUCUNE permission n'a jamais été définie (nouveau compte admin)
    // → donner les perms minimales par défaut
    if (!perms || perms.length === 0) return DEFAULT_ADMIN_PERMS.includes(perm);

    return perms.includes(perm);
  }

  function hasAnyPerm(...perms: string[]): boolean {
    return perms.some(p => hasPerm(p));
  }

  return { hasPerm, hasAnyPerm };
}