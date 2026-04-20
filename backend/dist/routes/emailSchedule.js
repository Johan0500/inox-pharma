"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const morningReport_1 = require("../utils/morningReport");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Récupérer la configuration
router.get("/", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN"), async (req, res) => {
    try {
        const schedule = await prisma.emailSchedule.findFirst({
            include: {
                recipients: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true, role: true,
                                adminLabs: { include: { laboratory: true } } },
                        },
                    },
                },
            },
        });
        res.json(schedule || null);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// Créer ou mettre à jour la configuration
router.post("/", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN"), async (req, res) => {
    try {
        const { hour, minute, isActive, recipientIds } = req.body;
        // Vérifier que les destinataires existent
        if (recipientIds && recipientIds.length > 0) {
            const users = await prisma.user.findMany({
                where: { id: { in: recipientIds } },
            });
            if (users.length !== recipientIds.length)
                return res.status(400).json({ error: "Certains utilisateurs introuvables" });
        }
        // Supprimer l'ancienne config
        await prisma.emailSchedule.deleteMany({});
        // Créer la nouvelle
        const schedule = await prisma.emailSchedule.create({
            data: {
                hour: parseInt(hour) || 9,
                minute: parseInt(minute) || 30,
                isActive: isActive !== false,
                createdById: req.user.id,
                recipients: {
                    create: (recipientIds || []).map((userId) => ({ userId })),
                },
            },
            include: {
                recipients: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
                    },
                },
            },
        });
        res.json({ message: "Configuration sauvegardée", schedule });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// Tester l'envoi immédiatement
router.post("/test", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN"), async (req, res) => {
    try {
        res.json({ message: "Envoi en cours..." });
        await (0, morningReport_1.sendMorningConnectionReport)();
    }
    catch (err) {
        res.status(500).json({ error: "Erreur lors de l'envoi test" });
    }
});
// Activer / désactiver
router.patch("/toggle", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN"), async (req, res) => {
    try {
        const schedule = await prisma.emailSchedule.findFirst();
        if (!schedule)
            return res.status(404).json({ error: "Aucune configuration" });
        const updated = await prisma.emailSchedule.update({
            where: { id: schedule.id },
            data: { isActive: !schedule.isActive },
        });
        res.json({ message: updated.isActive ? "Activé" : "Désactivé", schedule: updated });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
