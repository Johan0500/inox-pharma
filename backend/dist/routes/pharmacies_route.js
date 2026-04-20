"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ── Liste pharmacies avec filtres complets ───────────────────
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const { search, grossiste, zone, ville, region, page = "1", limit = "50", } = req.query;
        const where = { isActive: true };
        // Recherche texte
        if (search?.trim()) {
            where.OR = [
                { nom: { contains: search.trim(), mode: "insensitive" } },
                { pharmacien: { contains: search.trim(), mode: "insensitive" } },
                { adresse: { contains: search.trim(), mode: "insensitive" } },
                { ville: { contains: search.trim(), mode: "insensitive" } },
            ];
        }
        // Filtre grossiste
        if (grossiste && grossiste !== "all") {
            const g = await prisma.grossiste.findFirst({
                where: { name: { equals: grossiste, mode: "insensitive" } },
            });
            if (g)
                where.grossisteId = g.id;
        }
        // Filtre zone / région
        if (zone && zone !== "all") {
            where.region = { equals: zone, mode: "insensitive" };
        }
        // Filtre ville
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
        res.json({
            pharmacies,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / take),
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Filtres disponibles (zones, villes, grossistes) ──────────
router.get("/filters", auth_1.authenticate, async (req, res) => {
    try {
        const [zones, villes, grossistes, total] = await Promise.all([
            prisma.pharmacy.findMany({
                where: { isActive: true, region: { not: null } },
                select: { region: true },
                distinct: ["region"],
                orderBy: { region: "asc" },
            }),
            prisma.pharmacy.findMany({
                where: { isActive: true, ville: { not: null } },
                select: { ville: true },
                distinct: ["ville"],
                orderBy: { ville: "asc" },
            }),
            prisma.grossiste.findMany({ orderBy: { name: "asc" } }),
            prisma.pharmacy.count({ where: { isActive: true } }),
        ]);
        res.json({
            zones: zones.map((z) => z.region).filter(Boolean),
            villes: villes.map((v) => v.ville).filter(Boolean),
            grossistes: grossistes.map((g) => g.name),
            total,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Stats par zone et grossiste ──────────────────────────────
router.get("/stats", auth_1.authenticate, async (req, res) => {
    try {
        const byGrossiste = await prisma.pharmacy.groupBy({
            by: ["grossisteId"],
            where: { isActive: true },
            _count: { id: true },
        });
        const grossistes = await prisma.grossiste.findMany();
        const grossisteMap = Object.fromEntries(grossistes.map((g) => [g.id, g.name]));
        const byZone = await prisma.pharmacy.groupBy({
            by: ["region"],
            where: { isActive: true },
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
        });
        const total = await prisma.pharmacy.count({ where: { isActive: true } });
        res.json({
            total,
            byGrossiste: byGrossiste.map((b) => ({
                grossiste: grossisteMap[b.grossisteId || ""] || "Inconnu",
                count: b._count.id,
            })),
            byZone: byZone.map((b) => ({
                zone: b.region || "Inconnue",
                count: b._count.id,
            })),
        });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Détail d'une pharmacie ───────────────────────────────────
router.get("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const pharmacy = await prisma.pharmacy.findUnique({
            where: { id: req.params.id },
            include: {
                grossiste: { select: { name: true } },
                visitReports: {
                    include: {
                        delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
                    },
                    orderBy: { visitDate: "desc" },
                    take: 10,
                },
            },
        });
        if (!pharmacy)
            return res.status(404).json({ error: "Pharmacie non trouvée" });
        res.json(pharmacy);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
