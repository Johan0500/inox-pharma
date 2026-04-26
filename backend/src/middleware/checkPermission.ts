import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMS_KEY = "admin_permissions";

// Permissions par défaut pour un ADMIN
const DEFAULT_ADMIN_PERMS = [
  "view_gps","view_gps_history","view_reports","validate_reports","export_pdf",
  "view_objectives","edit_objectives","manage_delegates","send_notifications",
  "manage_planning","view_chiffres","edit_chiffres"
];

// Cache en mémoire pour éviter trop de lectures DB
const permCache: Record<string, { perms: string[]; at: number }> = {};
const CACHE_TTL = 60_000; // 1 min

async function getUserPerms(userId: string, role: string): Promise<string[]> {
  // Superadmin a tout
  if (role === "SUPER_ADMIN") return ["ALL"];

  const now = Date.now();
  if (permCache[userId] && now - permCache[userId].at < CACHE_TTL) {
    return permCache[userId].perms;
  }

  // Chercher les perms stockées en DB (on utilise un champ JSON sur User ou une table UserPref)
  // Pour l'instant on lit depuis un champ meta dans User s'il existe, sinon défaut
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true } as any,
  });

  // Perms stockées côté frontend en localStorage — on fait confiance au backend defaults
  // À terme: stocker dans DB dans un champ permissions JSON sur User
  const perms = DEFAULT_ADMIN_PERMS;
  permCache[userId] = { perms, at: now };
  return perms;
}

// Middleware factory
export function requirePerm(perm: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });

    const role  = req.user.role;

    // SuperAdmin passe toujours
    if (role === "SUPER_ADMIN") return next();

    // Delegate : aucune permission admin
    if (role === "DELEGATE") return res.status(403).json({ error: "Accès refusé" });

    const perms = await getUserPerms(req.user.id, role);
    if (!perms.includes(perm)) {
      return res.status(403).json({ error: `Permission manquante : ${perm}` });
    }
    next();
  };
}