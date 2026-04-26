import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { requirePerm } from "../middleware/checkPermission";

const router = Router();
const prisma = new PrismaClient();

// ── Liste des délégués ───────────────────────────────────────
router.get("/", authenticate, requirePerm("manage_delegates"), async (req: AuthRequest, res) => {
  try {
    const labName = req.headers["x-lab"] as string;
    const where: any = {};

    if (req.user!.role === "ADMIN") {
      // Admin → uniquement ses laboratoires
      const labs = await prisma.laboratory.findMany({
        where:  { name: { in: req.user!.labs || [] } },
        select: { id: true },
      });
      where.laboratoryId = { in: labs.map((l) => l.id) };
    } else if (req.user!.role === "SUPER_ADMIN" && labName && labName !== "all") {
      // Super Admin → filtre par lab sélectionné (header x-lab)
      const lab = await prisma.laboratory.findFirst({ where: { name: labName } });
      if (lab) where.laboratoryId = lab.id;
    }

    const delegates = await prisma.delegate.findMany({
      where,
      include: {
        user: {
          select: {
            firstName:      true,
            lastName:       true,
            email:          true,
            isActive:       true,
            activeSessions: { select: { lastActive: true } },
          },
        },
        laboratory: { select: { name: true } },
        sector:     { select: { zoneResidence: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(delegates);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Profil du délégué connecté ───────────────────────────────
router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const delegate = await prisma.delegate.findUnique({
      where: { userId: req.user!.id },
      include: {
        user:       { select: { firstName: true, lastName: true, email: true } },
        laboratory: true,
        sector:     true,
      },
    });
    if (!delegate) return res.status(404).json({ error: "Profil délégué non trouvé" });
    res.json(delegate);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;