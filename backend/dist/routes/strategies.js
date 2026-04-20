"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/strategies.ts
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ── Lister les stratégies ────────────────────────────────────
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const { laboratoryId, delegateId } = req.query;
        const where = {};
        if (req.user.role === "ADMIN") {
            const labIds = await prisma.laboratory.findMany({
                where: { name: { in: req.user.labs || [] } },
                select: { id: true },
            });
            where.laboratoryId = { in: labIds.map((l) => l.id) };
        }
        if (laboratoryId)
            where.laboratoryId = laboratoryId;
        if (delegateId)
            where.delegateId = delegateId;
        const strategies = await prisma.strategy.findMany({
            where,
            include: {
                laboratory: { select: { name: true } },
                createdBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(strategies);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Créer une stratégie ──────────────────────────────────────
router.post("/", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const { title, description, laboratoryId, targetProduct, targetZone, startDate, endDate } = req.body;
        if (!title || !laboratoryId)
            return res.status(400).json({ error: "Titre et laboratoire requis" });
        const strategy = await prisma.strategy.create({
            data: {
                title,
                description: description || null,
                laboratoryId,
                targetProduct: targetProduct || null,
                targetZone: targetZone || null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                createdById: req.user.id,
            },
            include: {
                laboratory: { select: { name: true } },
                createdBy: { select: { firstName: true, lastName: true } },
            },
        });
        res.status(201).json({ message: "Stratégie créée", strategy });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Détail d'une stratégie ───────────────────────────────────
router.get("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const strategy = await prisma.strategy.findUnique({
            where: { id: req.params.id },
            include: {
                laboratory: { select: { name: true } },
                createdBy: { select: { firstName: true, lastName: true } },
            },
        });
        if (!strategy)
            return res.status(404).json({ error: "Stratégie non trouvée" });
        res.json(strategy);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Modifier une stratégie ───────────────────────────────────
router.patch("/:id", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const { title, description, targetProduct, targetZone, startDate, endDate } = req.body;
        const strategy = await prisma.strategy.update({
            where: { id: req.params.id },
            data: {
                title: title ?? undefined,
                description: description ?? undefined,
                targetProduct: targetProduct ?? undefined,
                targetZone: targetZone ?? undefined,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
            },
        });
        res.json({ message: "Stratégie mise à jour", strategy });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Supprimer une stratégie ──────────────────────────────────
router.delete("/:id", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        await prisma.strategy.delete({ where: { id: req.params.id } });
        res.json({ message: "Stratégie supprimée" });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
