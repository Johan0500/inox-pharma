import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/positions", authenticate, requireRole("SUPER_ADMIN","ADMIN"), async (req: AuthRequest, res) => {
  try {
    const delegates = await prisma.delegate.findMany({
      include: {
        user:      { select: { firstName: true, lastName: true } },
        sector:    { select: { zoneResidence: true } },
        laboratory:{ select: { name: true } },
      },
    });

    const positions = delegates
      .filter((d) => d.lastLat && d.lastLng)
      .map((d) => ({
        id:         d.id,
        name:       `${d.user.firstName} ${d.user.lastName}`,
        zone:       d.zone,
        status:     d.status,
        laboratory: d.laboratory.name,
        lat:        d.lastLat,
        lng:        d.lastLng,
        lastSeen:   d.lastSeen,
      }));

    res.json(positions);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Historique d'un délégué
router.get("/history/:delegateId", authenticate, async (req, res) => {
  try {
    const { date } = req.query as any;
    const where: any = { delegateId: req.params.delegateId };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.timestamp = { gte: startOfDay, lte: endOfDay };
    }

    const logs = await prisma.gPSLog.findMany({
      where,
      orderBy: { timestamp: "asc" },
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Tous les historiques (admin)
router.get("/history", authenticate, requireRole("SUPER_ADMIN","ADMIN"), async (req, res) => {
  try {
    const { delegateId, date } = req.query as any;
    const where: any = {};
    if (delegateId) where.delegateId = delegateId;
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.timestamp = { gte: startOfDay, lte: endOfDay };
    }
    const logs = await prisma.gPSLog.findMany({
      where,
      include: {
        delegate: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { timestamp: "desc" },
      take:    1000,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;