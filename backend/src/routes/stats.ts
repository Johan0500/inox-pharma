import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/dashboard", authenticate, requireRole("SUPER_ADMIN","ADMIN"), async (req, res) => {
  try {
    const [totalDelegates, activeDelegates, totalReports, totalPharmacies, recentReports] = await Promise.all([
      prisma.delegate.count(),
      prisma.delegate.count({ where: { status: { not: "INACTIF" } } }),
      prisma.visitReport.count(),
      prisma.pharmacy.count({ where: { isActive: true } }),
      prisma.visitReport.findMany({
        take: 5,
        orderBy: { visitDate: "desc" },
        include: {
          delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
          laboratory: { select: { name: true } },
        },
      }),
    ]);
    res.json({ totalDelegates, activeDelegates, totalReports, totalPharmacies, recentReports });
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

export default router;
