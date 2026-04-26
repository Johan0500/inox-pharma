import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { requirePerm } from "../middleware/checkPermission";

const router = Router();
const prisma = new PrismaClient();

// ── Helper : filtre laboratoire selon rôle + header X-Lab ────
async function buildLabWhere(req: AuthRequest): Promise<any> {
  const labName = (req.headers["x-lab"] as string) || "";

  if (req.user!.role === "ADMIN") {
    // Admin : uniquement ses labos
    const labs = await prisma.laboratory.findMany({
      where:  { name: { in: req.user!.labs || [] } },
      select: { id: true },
    });
    return { laboratoryId: { in: labs.map((l) => l.id) } };
  }

  if (req.user!.role === "SUPER_ADMIN") {
    if (labName && labName !== "all") {
      const lab = await prisma.laboratory.findFirst({ where: { name: labName } });
      if (lab) return { laboratoryId: lab.id };
    }
    // "all" ou pas de filtre → pas de restriction
    return {};
  }

  return {};
}

// ── GET /gps/positions ───────────────────────────────────────
router.get("/positions", authenticate, requirePerm("view_gps"), async (req: AuthRequest, res) => {
  try {
    const labWhere = await buildLabWhere(req);

    const delegates = await prisma.delegate.findMany({
      where: labWhere,
      include: {
        user:       { select: { firstName: true, lastName: true } },
        sector:     { select: { zoneResidence: true } },
        laboratory: { select: { name: true } },
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

// ── GET /gps/history/:delegateId ─────────────────────────────
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

// ── GET /gps/history (admin — tous les délégués filtrés par labo) ──
router.get("/history", authenticate, requirePerm("view_gps_history"), async (req: AuthRequest, res) => {
  try {
    const { delegateId, date } = req.query as any;
    const labWhere = await buildLabWhere(req);

    // Récupérer les delegate IDs autorisés
    const allowedDelegates = labWhere.laboratoryId !== undefined
      ? await prisma.delegate.findMany({ where: labWhere, select: { id: true } })
      : null;

    const where: any = {};
    if (allowedDelegates) {
      where.delegateId = { in: allowedDelegates.map((d) => d.id) };
    }
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
          include: {
            user:       { select: { firstName: true, lastName: true } },
            laboratory: { select: { name: true } },
          },
        },
      },
      orderBy: { timestamp: "asc" },
      take:    2000,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── GET /gps/checkins (admin — check-ins filtrés par labo + période) ─
router.get("/checkins", authenticate, requirePerm("view_gps_history"), async (req: AuthRequest, res) => {
  try {
    const { delegateId, from, to } = req.query as any;
    const labWhere = await buildLabWhere(req);

    const allowedDelegates = labWhere.laboratoryId !== undefined
      ? await prisma.delegate.findMany({ where: labWhere, select: { id: true } })
      : null;

    const where: any = {};
    if (allowedDelegates) where.delegateId = { in: allowedDelegates.map((d) => d.id) };
    if (delegateId) where.delegateId = delegateId;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to)   where.timestamp.lte = new Date(to);
    }

    const checkIns = await prisma.checkIn.findMany({
      where,
      include: {
        delegate: {
          include: {
            user:       { select: { firstName: true, lastName: true } },
            laboratory: { select: { name: true } },
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take:    2000,
    });
    res.json(checkIns);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;