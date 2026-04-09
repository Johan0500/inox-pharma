import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      search, grossiste, zone, ville,
      page  = "1",
      limit = "50",
    } = req.query as Record<string, string>;

    // Filtre labo du super admin
    const labName = req.headers["x-lab"] as string;

    const where: any = {};  // Suppression du filtre isActive

    if (search?.trim()) {
      where.OR = [
        { nom:        { contains: search.trim(), mode: "insensitive" } },
        { pharmacien: { contains: search.trim(), mode: "insensitive" } },
        { ville:      { contains: search.trim(), mode: "insensitive" } },
        { region:     { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    if (grossiste && grossiste !== "all") {
      const g = await prisma.grossiste.findFirst({
        where: { name: { equals: grossiste, mode: "insensitive" } },
      });
      if (g) where.grossisteId = g.id;
    }

    if (zone && zone !== "all") {
      where.region = { equals: zone, mode: "insensitive" };
    }

    if (ville && ville !== "all") {
      where.ville = { equals: ville, mode: "insensitive" };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [pharmacies, total] = await Promise.all([
      prisma.pharmacy.findMany({
        where,
        skip,
        take,
        include: { grossiste: { select: { name: true } } },
        orderBy: { nom: "asc" },
      }),
      prisma.pharmacy.count({ where }),
    ]);

    res.json({ pharmacies, total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/filters", authenticate, async (req, res) => {
  try {
    const [zones, villes, grossistes, total] = await Promise.all([
      prisma.pharmacy.findMany({
        where:    { region: { not: null } },
        select:   { region: true },
        distinct: ["region"],
        orderBy:  { region: "asc" },
      }),
      prisma.pharmacy.findMany({
        where:    { ville: { not: null } },
        select:   { ville: true },
        distinct: ["ville"],
        orderBy:  { ville: "asc" },
      }),
      prisma.grossiste.findMany({ orderBy: { name: "asc" } }),
      prisma.pharmacy.count(),
    ]);

    res.json({
      zones:      zones.map((z) => z.region).filter(Boolean),
      villes:     villes.map((v) => v.ville).filter(Boolean),
      grossistes: grossistes.map((g) => g.name),
      total,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/stats", authenticate, async (req, res) => {
  try {
    const byGrossiste = await prisma.pharmacy.groupBy({
      by:     ["grossisteId"],
      _count: { id: true },
    });

    const grossistes   = await prisma.grossiste.findMany();
    const grossisteMap = Object.fromEntries(grossistes.map((g) => [g.id, g.name]));

    const byZone = await prisma.pharmacy.groupBy({
      by:      ["region"],
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const total = await prisma.pharmacy.count();

    res.json({
      total,
      byGrossiste: byGrossiste.map((b) => ({
        grossiste: grossisteMap[b.grossisteId || ""] || "Inconnu",
        count:     b._count.id,
      })),
      byZone: byZone.map((b) => ({
        zone:  b.region || "Inconnue",
        count: b._count.id,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const pharmacy = await prisma.pharmacy.findUnique({
      where:   { id: req.params.id },
      include: {
        grossiste:    { select: { name: true } },
        visitReports: {
          include: {
            delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
          orderBy: { visitDate: "desc" },
          take:    10,
        },
      },
    });
    if (!pharmacy) return res.status(404).json({ error: "Pharmacie non trouvée" });
    res.json(pharmacy);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;