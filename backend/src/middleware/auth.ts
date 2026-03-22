import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id:          string;
    role:        string;
    labs?:       string[];
    delegateId?: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token manquant" });
    }

    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Vérifier session active
    const session = await prisma.activeSession.findUnique({
      where: { userId: decoded.id },
    });

    if (!session || session.token !== token) {
      return res.status(401).json({
        error: "Session expirée ou déconnectée par un administrateur",
        code:  "SESSION_INVALID",
      });
    }

    // Vérifier inactivité 1h
    const inactiveLimit = 60 * 60 * 1000;
    if (Date.now() - new Date(session.lastActive).getTime() > inactiveLimit) {
      await prisma.activeSession.delete({ where: { userId: decoded.id } });
      return res.status(401).json({
        error: "Session expirée après 1h d'inactivité",
        code:  "SESSION_EXPIRED",
      });
    }

    // Mettre à jour lastActive
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
  } catch (err) {
    return res.status(401).json({ error: "Token invalide" });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé" });
    }
    next();
  };
};