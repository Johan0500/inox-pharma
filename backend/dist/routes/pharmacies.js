"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ── LISTER PHARMACIES avec filtres + pagination ───────────────
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const { grossiste, ville, region, province, search, page = "1", limit = "50", } = req.query;
        const where = {};
        if (grossiste) {
            const g = await prisma.grossiste.findUnique({ where: { name: grossiste } });
            if (g)
                where.grossisteId = g.id;
        }
        if (ville)
            where.ville = { contains: ville };
        if (region)
            where.region = { contains: region };
        if (province)
            where.province = { contains: province };
        if (search) {
            where.OR = [
                { nom: { contains: search } },
                { pharmacien: { contains: search } },
                { ville: { contains: search } },
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
    }
    catch (err) {
        console.error("Pharmacies error:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── STATISTIQUES par grossiste ────────────────────────────────
router.get("/stats", auth_1.authenticate, async (req, res) => {
    try {
        const stats = await prisma.grossiste.findMany({
            include: {
                _count: { select: { pharmacies: true } },
            },
        });
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── VILLES DISPONIBLES (pour filtres) ────────────────────────
router.get("/villes", auth_1.authenticate, async (req, res) => {
    try {
        const villes = await prisma.pharmacy.groupBy({
            by: ["ville"],
            where: { isActive: true, ville: { not: null } },
            orderBy: { ville: "asc" },
        });
        res.json(villes.map((v) => v.ville).filter(Boolean));
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
