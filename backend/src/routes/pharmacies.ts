import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// ── LISTER PHARMACIES avec filtres + pagination ───────────────
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      grossiste,
      ville,
      region,
      province,
      search,
      page = "1",
      limit = "50",
    } = req.query as any;

    const where: any = { isActive: true };

    if (grossiste) {
      const g = await prisma.grossiste.findUnique({ where: { name: grossiste } });
      if (g) where.grossisteId = g.id;
    }
    if (ville)    where.ville    = { contains: ville };
    if (region)   where.region   = { contains: region };
    if (province) where.province = { contains: province };
    if (search) {
      where.OR = [
        { nom:        { contains: search } },
        { pharmacien: { contains: search } },
        { ville:      { contains: search } },
        { codeClient: { contains: search } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [pharmacies, total] = await Promise.all([
      prisma.pharmacy.findMany({
        where,
        include: { grossiste: { select: { name: true } } },
        skip,
        take,
        orderBy: { nom: "asc" },
      }),
      prisma.pharmacy.count({ where }),
    ]);

    res.json({
      pharmacies,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / take),
    });
  } catch (err) {
    console.error("Pharmacies error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── STATISTIQUES par grossiste ────────────────────────────────
router.get("/stats", authenticate, async (req, res) => {
  try {
    const stats = await prisma.grossiste.findMany({
      include: {
        _count: { select: { pharmacies: true } },
      },
    });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── VILLES DISPONIBLES (pour filtres) ────────────────────────
router.get("/villes", authenticate, async (req, res) => {
  try {
    const villes = await prisma.pharmacy.groupBy({
      by: ["ville"],
      where: { isActive: true, ville: { not: null } },
      orderBy: { ville: "asc" },
    });
    res.json(villes.map((v) => v.ville).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
