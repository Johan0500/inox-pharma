// ═══════════════════════════════════════════════════════════════
// TOUTES LES ROUTES RESTANTES — UN SEUL FICHIER POUR FACILITER
// LA LECTURE. Dans votre projet, copiez chaque section dans son
// propre fichier comme indiqué par le commentaire de titre.
// ═══════════════════════════════════════════════════════════════

// ── FICHIER : src/routes/reports.ts ──────────────────────────
import { Router as ReportsRouter } from "express";
import { PrismaClient as PC1 } from "@prisma/client";
import { authenticate as auth1, requireRole as rr1, AuthRequest as AR1 } from "../middleware/auth";

export const reportsRouter = ReportsRouter();
const p1 = new PC1();

reportsRouter.post("/", auth1, rr1("DELEGATE"), async (req: AR1, res) => {
  try {
    const { doctorName, specialty, pharmacyId, productsShown, notes, aiSummary } = req.body;
    if (!doctorName || !notes)
      return res.status(400).json({ error: "Médecin et notes requis" });

    const delegate = await p1.delegate.findUnique({ where: { userId: req.user!.id } });
    if (!delegate) return res.status(404).json({ error: "Profil délégué non trouvé" });

    const report = await p1.visitReport.create({
      data: {
        delegateId:    delegate.id,
        laboratoryId:  delegate.laboratoryId,
        doctorName:    doctorName.trim(),
        specialty:     specialty || null,
        pharmacyId:    pharmacyId || null,
        productsShown: productsShown || null,
        notes,
        aiSummary:     aiSummary || null,
      },
      include: {
        delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
        pharmacy: { select: { nom: true, ville: true } },
        laboratory: { select: { name: true } },
      },
    });
    res.status(201).json({ message: "Rapport enregistré", report });
  } catch (err) {
    console.error("Create report error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

reportsRouter.get("/", auth1, async (req: AR1, res) => {
  try {
    const { delegateId, from, to, page = "1", limit = "20" } = req.query as any;
    const where: any = {};

    if (req.user!.role === "ADMIN") {
      const labIds = await p1.laboratory.findMany({
        where: { name: { in: req.user!.labs || [] } },
        select: { id: true },
      });
      where.laboratoryId = { in: labIds.map((l) => l.id) };
    }
    if (req.user!.role === "DELEGATE") {
      const delegate = await p1.delegate.findUnique({ where: { userId: req.user!.id } });
      if (delegate) where.delegateId = delegate.id;
    }
    if (delegateId) where.delegateId = delegateId;
    if (from || to) {
      where.visitDate = {};
      if (from) where.visitDate.gte = new Date(from);
      if (to)   where.visitDate.lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reports, total] = await Promise.all([
      p1.visitReport.findMany({
        where, skip, take: parseInt(limit),
        include: {
          delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
          pharmacy: { select: { nom: true, ville: true } },
          laboratory: { select: { name: true } },
        },
        orderBy: { visitDate: "desc" },
      }),
      p1.visitReport.count({ where }),
    ]);
    res.json({ reports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── FICHIER : src/routes/gps.ts ───────────────────────────────
import { Router as GpsRouter } from "express";
import { PrismaClient as PC2 } from "@prisma/client";
import { authenticate as auth2, requireRole as rr2, AuthRequest as AR2 } from "../middleware/auth";

export const gpsRouter = GpsRouter();
const p2 = new PC2();

gpsRouter.get("/positions", auth2, rr2("SUPER_ADMIN", "ADMIN"), async (req: AR2, res) => {
  try {
    const where: any =
      req.user!.role === "ADMIN"
        ? { laboratory: { name: { in: req.user!.labs || [] } } }
        : {};

    const delegates = await p2.delegate.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true } },
        sector: { select: { zoneResidence: true } },
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

gpsRouter.get("/history/:delegateId", auth2, async (req, res) => {
  try {
    const { date } = req.query as any;
    const startOfDay = date ? new Date(date) : new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await p2.gPSLog.findMany({
      where: {
        delegateId: req.params.delegateId,
        timestamp: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { timestamp: "asc" },
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── FICHIER : src/routes/products.ts ─────────────────────────
import { Router as ProdRouter } from "express";
import { PrismaClient as PC3 } from "@prisma/client";
import { authenticate as auth3, requireRole as rr3, AuthRequest as AR3 } from "../middleware/auth";

export const productsRouter = ProdRouter();
const p3 = new PC3();

productsRouter.get("/", auth3, async (req, res) => {
  try {
    const { specialty, group } = req.query as any;
    const where: any = { isActive: true };
    if (specialty) where.specialty = specialty;
    if (group)     where.group     = group;
    const products = await p3.product.findMany({ where, orderBy: [{ group: "asc" }, { name: "asc" }] });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

productsRouter.get("/specialties", auth3, async (req, res) => {
  try {
    const specialties = await p3.product.groupBy({
      by: ["specialty", "group"],
      where: { isActive: true },
      orderBy: { group: "asc" },
    });
    res.json(specialties);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── FICHIER : src/routes/planning.ts ─────────────────────────
import { Router as PlanRouter } from "express";
import { PrismaClient as PC4 } from "@prisma/client";
import { authenticate as auth4, AuthRequest as AR4 } from "../middleware/auth";

export const planningRouter = PlanRouter();
const p4 = new PC4();

planningRouter.get("/", auth4, async (req: AR4, res) => {
  try {
    const { delegateId, zone, month } = req.query as any;
    const where: any = {};

    if (req.user!.role === "DELEGATE" && req.user!.delegateId)
      where.delegateId = req.user!.delegateId;
    else if (delegateId)
      where.delegateId = delegateId;

    if (zone)  where.zone  = { contains: zone };
    if (month) where.month = month;

    const plans = await p4.weeklyPlanning.findMany({
      where,
      orderBy: [{ zone: "asc" }, { weekNumber: "asc" }],
      include: {
        delegate: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── FICHIER : src/routes/stats.ts ────────────────────────────
import { Router as StatsRouter } from "express";
import { PrismaClient as PC5 } from "@prisma/client";
import { authenticate as auth5, requireRole as rr5, AuthRequest as AR5 } from "../middleware/auth";

export const statsRouter = StatsRouter();
const p5 = new PC5();

statsRouter.get("/dashboard", auth5, rr5("SUPER_ADMIN", "ADMIN"), async (req: AR5, res) => {
  try {
    const [totalDelegates, activeDelegates, totalReports, totalPharmacies, recentReports] =
      await Promise.all([
        p5.delegate.count(),
        p5.delegate.count({ where: { status: { not: "INACTIF" } } }),
        p5.visitReport.count(),
        p5.pharmacy.count({ where: { isActive: true } }),
        p5.visitReport.findMany({
          take: 5,
          orderBy: { visitDate: "desc" },
          include: {
            delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
            laboratory: { select: { name: true } },
          },
        }),
      ]);

    res.json({ totalDelegates, activeDelegates, totalReports, totalPharmacies, recentReports });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

statsRouter.get("/reports-by-delegate", auth5, rr5("SUPER_ADMIN", "ADMIN"), async (req: AR5, res) => {
  try {
    const data = await p5.visitReport.groupBy({
      by: ["delegateId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── FICHIER : src/routes/delegates.ts ────────────────────────
import { Router as DelRouter } from "express";
import { PrismaClient as PC6 } from "@prisma/client";
import { authenticate as auth6, requireRole as rr6, AuthRequest as AR6 } from "../middleware/auth";

export const delegatesRouter = DelRouter();
const p6 = new PC6();

delegatesRouter.get("/", auth6, rr6("SUPER_ADMIN", "ADMIN"), async (req: AR6, res) => {
  try {
    const where: any =
      req.user!.role === "ADMIN"
        ? { laboratory: { name: { in: req.user!.labs || [] } } }
        : {};

    const delegates = await p6.delegate.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, isActive: true } },
        laboratory: { select: { name: true } },
        sector: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(delegates);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

delegatesRouter.get("/me", auth6, async (req: AR6, res) => {
  try {
    const delegate = await p6.delegate.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        laboratory: true,
        sector: true,
        planning: { where: { month: new Date().toISOString().slice(0, 7) } },
      },
    });
    if (!delegate) return res.status(404).json({ error: "Profil délégué non trouvé" });
    res.json(delegate);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── FICHIER : src/routes/grossistes.ts ───────────────────────
import { Router as GrossRouter } from "express";
import { PrismaClient as PC7 } from "@prisma/client";
import { authenticate as auth7, requireRole as rr7 } from "../middleware/auth";

export const grossistesRouter = GrossRouter();
const p7 = new PC7();

grossistesRouter.get("/", auth7, async (req, res) => {
  try {
    const grossistes = await p7.grossiste.findMany({
      include: { _count: { select: { pharmacies: true } } },
    });
    res.json(grossistes);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── FICHIER : src/routes/laboratories.ts ─────────────────────
import { Router as LabRouter } from "express";
import { PrismaClient as PC8 } from "@prisma/client";
import { authenticate as auth8 } from "../middleware/auth";

export const laboratoriesRouter = LabRouter();
const p8 = new PC8();

laboratoriesRouter.get("/", auth8, async (req, res) => {
  try {
    const labs = await p8.laboratory.findMany({
      include: { _count: { select: { delegates: true, reports: true } } },
    });
    res.json(labs);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── FICHIER : src/routes/sectors.ts ──────────────────────────
import { Router as SecRouter } from "express";
import { PrismaClient as PC9 } from "@prisma/client";
import { authenticate as auth9 } from "../middleware/auth";

export const sectorsRouter = SecRouter();
const p9 = new PC9();

sectorsRouter.get("/", auth9, async (req, res) => {
  try {
    const { type } = req.query as any;
    const where: any = type ? { type } : {};
    const sectors = await p9.sector.findMany({
      where,
      include: { _count: { select: { delegates: true } } },
      orderBy: [{ type: "asc" }, { numero: "asc" }],
    });
    res.json(sectors);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});
