import { Request, Response, NextFunction } from "express";
import jwt              from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: { id: string; role: string; labs?: string[]; delegateId?: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ error: "Token manquant" });

    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Vérifier que la session est toujours active (déconnexion forcée par admin)
    const session = await prisma.activeSession.findUnique({
      where: { userId: decoded.id },
    });

    if (!session || session.token !== token) {
      return res.status(401).json({
        error: "Session terminée. Veuillez vous reconnecter.",
        code:  "SESSION_INVALID",
      });
    }

    // Mettre à jour lastActive (sans vérifier l'inactivité)
    await prisma.activeSession.update({
      where: { userId: decoded.id },
      data:  { lastActive: new Date() },
    });

    req.user = {
      id:          decoded.id,
      role:        decoded.role,
      labs:        decoded.labs,
      delegateId:  decoded.delegateId,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: "Accès refusé" });
    next();
  };
};