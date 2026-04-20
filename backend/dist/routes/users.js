"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const ALLOWED_LABS = ["lic-pharma", "croient"];
// ── Routes fixes (AVANT les routes avec :id) ─────────────────
// Liste des utilisateurs
router.get("/", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const where = {};
        if (req.user.role === "ADMIN") {
            const labIds = await prisma.laboratory.findMany({
                where: { name: { in: req.user.labs || [] } },
                select: { id: true },
            });
            where.OR = [
                { adminLabs: { some: { laboratoryId: { in: labIds.map((l) => l.id) } } } },
                { delegate: { laboratoryId: { in: labIds.map((l) => l.id) } } },
            ];
        }
        const users = await prisma.user.findMany({
            where,
            include: {
                adminLabs: { include: { laboratory: true } },
                delegate: { include: { laboratory: true, sector: true } },
                activeSessions: { select: { lastActive: true, deviceInfo: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(users);
    }
    catch (err) {
        console.error("Get users error:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// Créer un utilisateur
router.post("/", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const { email, password, firstName, lastName, role, labs, zone, phone } = req.body;
        if (!email || !password || !firstName || !lastName)
            return res.status(400).json({ error: "Champs obligatoires manquants" });
        if (password.length < 6)
            return res.status(400).json({ error: "Le mot de passe doit avoir au moins 6 caractères" });
        if (req.user.role === "ADMIN" && role === "SUPER_ADMIN")
            return res.status(403).json({ error: "Accès refusé" });
        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (existing)
            return res.status(400).json({ error: "Cet email est déjà utilisé" });
        const labsToUse = (labs || []).filter((l) => ALLOWED_LABS.includes(l));
        const hash = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase().trim(),
                password: hash,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                role: role || "DELEGATE",
                createdById: req.user.id,
            },
        });
        if ((role === "DELEGATE" || !role) && labsToUse.length > 0) {
            const lab = await prisma.laboratory.findFirst({
                where: { name: { equals: labsToUse[0], mode: "insensitive" } },
            });
            if (lab) {
                await prisma.delegate.create({
                    data: {
                        userId: user.id,
                        laboratoryId: lab.id,
                        zone: zone?.trim() || "Non défini",
                        phone: phone?.trim() || null,
                    },
                });
            }
        }
        if (role === "ADMIN" && labsToUse.length > 0) {
            for (const labName of labsToUse) {
                const lab = await prisma.laboratory.findFirst({
                    where: { name: { equals: labName, mode: "insensitive" } },
                });
                if (lab) {
                    await prisma.adminLaboratory.create({ data: { userId: user.id, laboratoryId: lab.id } });
                }
            }
        }
        res.status(201).json({ message: "Utilisateur créé avec succès", user });
    }
    catch (err) {
        console.error("Create user error:", err);
        res.status(500).json({ error: "Erreur serveur lors de la création" });
    }
});
// Mettre à jour son profil
router.patch("/me/profile", auth_1.authenticate, async (req, res) => {
    try {
        const { firstName, lastName, avatar } = req.body;
        const data = {};
        if (firstName?.trim())
            data.firstName = firstName.trim();
        if (lastName?.trim())
            data.lastName = lastName.trim();
        if (avatar !== undefined)
            data.avatar = avatar;
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data,
            select: { id: true, firstName: true, lastName: true, email: true, role: true, avatar: true },
        });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// Changer son mot de passe
router.patch("/me/password", auth_1.authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            return res.status(400).json({ error: "Ancien et nouveau mot de passe requis" });
        if (newPassword.length < 6)
            return res.status(400).json({ error: "Minimum 6 caractères" });
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        const isValid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValid)
            return res.status(401).json({ error: "Mot de passe actuel incorrect" });
        const hash = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });
        res.json({ message: "Mot de passe changé avec succès" });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// Déconnecter TOUS les utilisateurs (AVANT /:id pour éviter le conflit)
router.delete("/sessions/all", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        await prisma.activeSession.deleteMany({ where: { userId: { not: req.user.id } } });
        res.json({ message: "Tous les utilisateurs déconnectés" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Routes avec :id (APRÈS les routes fixes) ─────────────────
// Activer / désactiver
router.patch("/:id/toggle", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const target = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!target)
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        if (req.user.role === "ADMIN" && target.role === "SUPER_ADMIN")
            return res.status(403).json({ error: "Accès refusé" });
        const updated = await prisma.user.update({
            where: { id: req.params.id },
            data: { isActive: !target.isActive },
        });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// Déconnecter un utilisateur spécifique
router.delete("/:id/session", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        await prisma.activeSession.deleteMany({ where: { userId: req.params.id } });
        res.json({ message: "Utilisateur déconnecté" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// Supprimer complètement un utilisateur
router.delete("/:id", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN"), async (req, res) => {
    try {
        if (req.params.id === req.user.id)
            return res.status(400).json({ error: "Impossible de supprimer votre propre compte" });
        await prisma.activeSession.deleteMany({ where: { userId: req.params.id } });
        await prisma.loginHistory.deleteMany({ where: { userId: req.params.id } });
        await prisma.message.deleteMany({
            where: { OR: [{ senderId: req.params.id }, { receiverId: req.params.id }] },
        });
        await prisma.pushSubscription.deleteMany({ where: { userId: req.params.id } });
        await prisma.adminLaboratory.deleteMany({ where: { userId: req.params.id } });
        const delegate = await prisma.delegate.findUnique({ where: { userId: req.params.id } });
        if (delegate) {
            await prisma.delegateObjective.deleteMany({ where: { delegateId: delegate.id } });
            await prisma.weeklyPlanning.deleteMany({ where: { delegateId: delegate.id } });
            await prisma.gPSLog.deleteMany({ where: { delegateId: delegate.id } });
            await prisma.delegate.delete({ where: { userId: req.params.id } });
        }
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ message: "Utilisateur supprimé définitivement" });
    }
    catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({ error: "Erreur lors de la suppression" });
    }
});
exports.default = router;
