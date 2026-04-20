"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const morningReport_1 = require("../utils/morningReport");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ── Lire la config ───────────────────────────────────────────
router.get("/", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN"), async (req, res) => {
    try {
        const config = await prisma.reportConfig.findFirst({
            where: { isActive: true },
            include: {
                recipients: {
                    include: {
                        user: {
                            select: {
                                id: true, firstName: true, lastName: true,
                                email: true, role: true,
                                adminLabs: { include: { laboratory: { select: { name: true } } } },
                            },
                        },
                    },
                },
            },
        });
        res.json(config);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Modifier l'heure d'envoi ─────────────────────────────────
router.patch("/schedule", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN"), async (req, res) => {
    try {
        const { sendHour, sendMinute } = req.body;
        if (sendHour === undefined || sendMinute === undefined)
            return res.status(400).json({ error: "sendHour et sendMinute requis" });
        if (sendHour < 0 || sendHour > 23 || sendMinute < 0 || sendMinute > 59)
            return res.status(400).json({ error: "Heure invalide" });
        let config = await prisma.reportConfig.findFirst({ where: { isActive: true } });
        if (!config) {
            config = await prisma.reportConfig.create({ data: { sendHour, sendMinute } });
        }
        else {
            config = await prisma.reportConfig.update({
                where: { id: config.id },
                data: { sendHour, sendMinute },
            });
        }
        // Replanifier avec la nouvelle heure
        await (0, morningReport_1.scheduleMorningReport)();
        res.json({ message: `Rapport planifié à ${sendHour}h${String(sendMinute).padStart(2, "0")}`, config });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Ajouter un destinataire ──────────────────────────────────
router.post("/recipients", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN"), async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId)
            return res.status(400).json({ error: "userId requis" });
        let config = await prisma.reportConfig.findFirst({ where: { isActive: true } });
        if (!config) {
            config = await prisma.reportConfig.create({ data: { sendHour: 9, sendMinute: 30 } });
        }
        const recipient = await prisma.reportRecipient.create({
            data: { userId, reportConfigId: config.id },
            include: {
                user: {
                    select: {
                        id: true, firstName: true, lastName: true, email: true,
                        adminLabs: { include: { laboratory: { select: { name: true } } } },
                    },
                },
            },
        });
        res.status(201).json(recipient);
    }
    catch (err) {
        if (err.code === "P2002")
            return res.status(400).json({ error: "Cet utilisateur est déjà destinataire" });
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Supprimer un destinataire ────────────────────────────────
router.delete("/recipients/:userId", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN"), async (req, res) => {
    try {
        await prisma.reportRecipient.deleteMany({ where: { userId: req.params.userId } });
        res.json({ message: "Destinataire retiré" });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Test immédiat ────────────────────────────────────────────
router.post("/test", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN"), async (req, res) => {
    try {
        await (0, morningReport_1.sendMorningConnectionReport)();
        res.json({ message: "Rapport envoyé ✅" });
    }
    catch (err) {
        res.status(500).json({ error: "Échec", details: String(err) });
    }
});
exports.default = router;
