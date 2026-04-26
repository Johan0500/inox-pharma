import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ADMIN_PERMS = [
  "view_reports", "view_gps", "view_objectives", "view_chiffres",
];

// Cache en mémoire (TTL 30s) pour éviter une requête DB à chaque appel API
const permCache: Record<string, { perms: string[]; at: number }> = {};
const CACHE_TTL = 30_000;

export async function getUserPerms(userId: string): Promise<string[]> {
  const now = Date.now();
  if (permCache[userId] && now - permCache[userId].at < CACHE_TTL) {
    return permCache[userId].perms;
  }

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { permissions: true } as any,
  });

  const stored = (user as any)?.permissions;
  // Si le superadmin n'a jamais défini de perms → utiliser les défauts
  const perms = Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_ADMIN_PERMS;
  permCache[userId] = { perms, at: now };
  return perms;
}

// Invalider le cache quand les permissions changent
export function invalidatePermCache(userId: string) {
  delete permCache[userId];
}

// Middleware factory
export function requirePerm(perm: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });

    const { role, id } = req.user;

    // SuperAdmin passe toujours
    if (role === "SUPER_ADMIN") return next();

    // Delegate bloqué
    if (role !== "ADMIN") return res.status(403).json({ error: "Accès refusé" });

    const perms = await getUserPerms(id);
    if (!perms.includes(perm)) {
      return res.status(403).json({
        error:   `Permission requise : ${perm}`,
        missing: perm,
      });
    }
    next();
  };
}