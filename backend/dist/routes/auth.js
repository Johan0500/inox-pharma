"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ── Login ────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: "Email et mot de passe requis" });
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: {
                adminLabs: { include: { laboratory: true } },
                delegate: { include: { laboratory: true } },
            },
        });
        if (!user || !(await bcryptjs_1.default.compare(password, user.password)))
            return res.status(401).json({ error: "Email ou mot de passe incorrect" });
        if (!user.isActive)
            return res.status(403).json({ error: "Compte désactivé" });
        // Vérifier session existante
        const existing = await prisma.activeSession.findUnique({ where: { userId: user.id } });
        if (existing) {
            // Supprimer l'ancienne session (pas de blocage multi-appareils)
            await prisma.activeSession.delete({ where: { userId: user.id } });
        }
        const labs = user.adminLabs?.map((al) => al.laboratory.name) || [];
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, labs, delegateId: user.delegate?.id }, process.env.JWT_SECRET, { expiresIn: "24h" });
        await prisma.activeSession.create({
            data: {
                userId: user.id,
                token,
                deviceInfo: req.headers["user-agent"] || "Unknown",
                lastActive: new Date(),
            },
        });
        // Historique connexion
        await prisma.loginHistory.create({
            data: {
                userId: user.id,
                deviceInfo: req.headers["user-agent"] || "Unknown",
                ipAddress: req.headers["x-forwarded-for"] || req.ip || "Unknown",
                success: true,
            },
        });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: user.isActive,
                labs,
                delegate: user.delegate
                    ? { id: user.delegate.id, zone: user.delegate.zone, status: user.delegate.status }
                    : null,
            },
        });
    }
    catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Logout ───────────────────────────────────────────────────
router.post("/logout", auth_1.authenticate, async (req, res) => {
    try {
        await prisma.activeSession.deleteMany({ where: { userId: req.user.id } });
        res.json({ message: "Déconnexion réussie" });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Historique connexions ────────────────────────────────────
router.get("/history", auth_1.authenticate, async (req, res) => {
    try {
        const history = await prisma.loginHistory.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
            take: 20,
        });
        res.json(history);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
router.get("/history/all", auth_1.authenticate, async (req, res) => {
    try {
        if (!["SUPER_ADMIN", "ADMIN"].includes(req.user.role))
            return res.status(403).json({ error: "Accès refusé" });
        const history = await prisma.loginHistory.findMany({
            include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
            orderBy: { createdAt: "desc" },
            take: 200,
        });
        res.json(history);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
