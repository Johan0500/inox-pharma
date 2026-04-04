import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// ── Helper : construit les filtres lab selon le rôle ─────────
async function buildLabFilter(req: AuthRequest) {
  const labName = req.headers["x-lab"] as string;
  const labWhere: any = {};

  if (req.user!.role === "SUPER_ADMIN" && labName && labName !== "all") {
    const lab = await prisma.laboratory.findFirst({ where: { name: labName } });
    if (lab) labWhere.laboratoryId = lab.id;
  } else if (req.user!.role === "ADMIN") {
    const labs = await prisma.laboratory.findMany({
      where:  { name: { in: req.user!.labs || [] } },
      select: { id: true },
    });
    labWhere.laboratoryId = { in: labs.map((l) => l.id) };
  }

  return labWhere;
}

// ── Dashboard principal (avec filtre lab) ────────────────────
router.get("/", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const labWhere     = await buildLabFilter(req);
    const delegateWhere: any = labWhere.laboratoryId
      ? { laboratoryId: labWhere.laboratoryId }
      : {};

    const [
      totalDelegates,
      activeDelegates,
      totalReports,
      totalPharmacies,
      recentReports,
    ] = await Promise.all([
      prisma.delegate.count({ where: delegateWhere }),
      prisma.delegate.count({ where: { ...delegateWhere, status: { not: "INACTIF" } } }),
      prisma.visitReport.count({ where: labWhere }),
      prisma.pharmacy.count({ where: { isActive: true } }),
      prisma.visitReport.findMany({
        where:   labWhere,
        include: {
          delegate:   { include: { user: { select: { firstName: true, lastName: true } } } },
          pharmacy:   { select: { nom: true } },
          laboratory: { select: { name: true } },
        },
        orderBy: { visitDate: "desc" },
        take:    5,
      }),
    ]);

    res.json({ totalDelegates, activeDelegates, totalReports, totalPharmacies, recentReports });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Dashboard legacy /dashboard (alias sans filtre lab) ──────
router.get("/dashboard", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const [
      totalDelegates,
      activeDelegates,
      totalReports,
      totalPharmacies,
      recentReports,
    ] = await Promise.all([
      prisma.delegate.count(),
      prisma.delegate.count({ where: { status: { not: "INACTIF" } } }),
      prisma.visitReport.count(),
      prisma.pharmacy.count({ where: { isActive: true } }),
      prisma.visitReport.findMany({
        take:    5,
        orderBy: { visitDate: "desc" },
        include: {
          delegate:   { include: { user: { select: { firstName: true, lastName: true } } } },
          pharmacy:   { select: { nom: true } },
          laboratory: { select: { name: true } },
        },
      }),
    ]);

    res.json({ totalDelegates, activeDelegates, totalReports, totalPharmacies, recentReports });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;