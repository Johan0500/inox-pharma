import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate }  from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// ── Coordonnées approximatives par ville ─────────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  "ABIDJAN":      [5.3484,  -4.0107],
  "YOPOUGON":     [5.3600,  -4.0700],
  "COCODY":       [5.3767,  -3.9867],
  "ABOBO":        [5.4200,  -4.0200],
  "ADJAME":       [5.3700,  -4.0167],
  "BOUAKE":       [7.6939,  -5.0319],
  "DALOA":        [6.8744,  -6.4503],
  "YAMOUSSOUKRO": [6.8276,  -5.2893],
  "KORHOGO":      [9.4582,  -5.6297],
  "SAN PEDRO":    [4.7485,  -6.6363],
  "MAN":          [7.4126,  -7.5533],
  "GAGNOA":       [6.1319,  -5.9500],
  "DIVO":         [5.8397,  -5.3567],
  "ABENGOUROU":   [6.7297,  -3.4964],
  "BONDOUKOU":    [8.0405,  -2.7997],
};

function addCoords(p: any) {
  const ville  = (p.ville || "").toUpperCase().trim();
  const coords = CITY_COORDS[ville] ?? CITY_COORDS["ABIDJAN"];
  const seed   = p.id.charCodeAt(0) / 1000;
  return {
    ...p,
    latitude:  coords[0] + Math.sin(seed * 12345) * 0.05,
    longitude: coords[1] + Math.cos(seed * 67890) * 0.05,
  };
}

// ── Lister les pharmacies avec filtres + pagination ───────────

router.get("/", authenticate, async (req, res) => {
  try {
    const {
      grossiste,
      ville,
      region,
      province,
      search,
      page  = "1",
      limit = "50",
    } = req.query as Record<string, string>;

    const where: any = {};

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

    const pharmaciesWithCoords = pharmacies.map(addCoords);

    res.json({
      pharmacies: pharmaciesWithCoords,
      total,
      page:  parseInt(page),
      pages: Math.ceil(total / take),
    });
  } catch (err) {
    console.error("Pharmacies error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Statistiques par grossiste ────────────────────────────────

router.get("/stats", authenticate, async (_req, res) => {
  try {
    const stats = await prisma.grossiste.findMany({
      include: { _count: { select: { pharmacies: true } } },
    });
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Villes disponibles (pour filtres) ────────────────────────

router.get("/villes", authenticate, async (_req, res) => {
  try {
    const villes = await prisma.pharmacy.groupBy({
      by:      ["ville"],
      where:   { isActive: true, ville: { not: null } },
      orderBy: { ville: "asc" },
    });
    res.json(villes.map((v) => v.ville).filter(Boolean));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;