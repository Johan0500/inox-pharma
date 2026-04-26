import { useAuth } from "../contexts/AuthContext";

const DEFAULT_ADMIN_PERMS = [
  "view_gps","view_gps_history","view_reports","validate_reports","export_pdf",
  "view_objectives","edit_objectives","manage_delegates","send_notifications",
  "manage_planning","view_chiffres","edit_chiffres",
];

export function usePermission() {
  const { user } = useAuth();

  function hasPerm(perm: string): boolean {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;
    if (user.role === "DELEGATE")    return false;
    const perms = user.permissions;
    if (!perms || perms.length === 0) return DEFAULT_ADMIN_PERMS.includes(perm);
    return perms.includes(perm);
  }

  function hasAnyPerm(...perms: string[]): boolean {
    return perms.some(p => hasPerm(p));
  }

  return { hasPerm, hasAnyPerm };
}