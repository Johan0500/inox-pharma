import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest }  from "./auth";

const prisma = new PrismaClient();

// Middleware qui injecte le filtre labo dans req
export async function injectLabFilter(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const labName = req.headers["x-lab"] as string;

  if (!labName || labName === "all" || req.user?.role === "ADMIN") {
    (req as any).labFilter = null;
    (req as any).labIds    = null;
    return next();
  }

  try {
    const lab = await prisma.laboratory.findFirst({
      where: { name: labName },
    });
    (req as any).labFilter = lab ? { laboratoryId: lab.id } : null;
    (req as any).labIds    = lab ? [lab.id] : null;
  } catch {
    (req as any).labFilter = null;
    (req as any).labIds    = null;
  }
  next();
}