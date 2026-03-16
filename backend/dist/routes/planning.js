"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Lire le planning
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const { delegateId, zone, month } = req.query;
        const where = {};
        if (req.user.role === "DELEGATE" && req.user.delegateId)
            where.delegateId = req.user.delegateId;
        else if (delegateId)
            where.delegateId = delegateId;
        if (zone)
            where.zone = { contains: zone };
        if (month)
            where.month = month;
        const plans = await prisma.weeklyPlanning.findMany({
            where,
            orderBy: [{ zone: "asc" }, { weekNumber: "asc" }],
            include: {
                delegate: {
                    include: {
                        user: { select: { firstName: true, lastName: true } },
                    },
                },
            },
        });
        res.json(plans);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// Créer un planning
router.post("/", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const { delegateId, weekNumber, zone, lundi, mardi, mercredi, jeudi, vendredi, month } = req.body;
        if (!delegateId || !weekNumber || !zone || !month)
            return res.status(400).json({ error: "delegateId, weekNumber, zone et month sont requis" });
        // Vérifier que le délégué existe
        const delegate = await prisma.delegate.findUnique({
            where: { id: delegateId },
            include: { laboratory: true },
        });
        if (!delegate)
            return res.status(404).json({ error: "Délégué non trouvé" });
        // Admin ne peut gérer que ses propres labos
        if (req.user.role === "ADMIN" && !req.user.labs?.includes(delegate.laboratory.name))
            return res.status(403).json({ error: "Ce délégué n'appartient pas à votre laboratoire" });
        const plan = await prisma.weeklyPlanning.create({
            data: {
                delegateId,
                weekNumber: parseInt(weekNumber),
                zone,
                lundi: lundi || null,
                mardi: mardi || null,
                mercredi: mercredi || null,
                jeudi: jeudi || null,
                vendredi: vendredi || null,
                month,
            },
            include: {
                delegate: {
                    include: { user: { select: { firstName: true, lastName: true } } },
                },
            },
        });
        res.status(201).json({ message: "Planning créé", plan });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// Modifier un planning existant
router.patch("/:id", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const { lundi, mardi, mercredi, jeudi, vendredi, zone, weekNumber, month } = req.body;
        const plan = await prisma.weeklyPlanning.update({
            where: { id: req.params.id },
            data: {
                lundi: lundi ?? undefined,
                mardi: mardi ?? undefined,
                mercredi: mercredi ?? undefined,
                jeudi: jeudi ?? undefined,
                vendredi: vendredi ?? undefined,
                zone: zone ?? undefined,
                weekNumber: weekNumber ? parseInt(weekNumber) : undefined,
                month: month ?? undefined,
            },
        });
        res.json({ message: "Planning mis à jour", plan });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// Supprimer un planning
router.delete("/:id", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        await prisma.weeklyPlanning.delete({ where: { id: req.params.id } });
        res.json({ message: "Planning supprimé" });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
