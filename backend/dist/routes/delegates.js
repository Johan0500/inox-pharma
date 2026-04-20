"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ── Liste des délégués ───────────────────────────────────────
router.get("/", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const labName = req.headers["x-lab"];
        const where = {};
        if (req.user.role === "ADMIN") {
            // Admin → uniquement ses laboratoires
            const labs = await prisma.laboratory.findMany({
                where: { name: { in: req.user.labs || [] } },
                select: { id: true },
            });
            where.laboratoryId = { in: labs.map((l) => l.id) };
        }
        else if (req.user.role === "SUPER_ADMIN" && labName && labName !== "all") {
            // Super Admin → filtre par lab sélectionné (header x-lab)
            const lab = await prisma.laboratory.findFirst({ where: { name: labName } });
            if (lab)
                where.laboratoryId = lab.id;
        }
        const delegates = await prisma.delegate.findMany({
            where,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        isActive: true,
                        activeSessions: { select: { lastActive: true } },
                    },
                },
                laboratory: { select: { name: true } },
                sector: { select: { zoneResidence: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(delegates);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Profil du délégué connecté ───────────────────────────────
router.get("/me", auth_1.authenticate, async (req, res) => {
    try {
        const delegate = await prisma.delegate.findUnique({
            where: { userId: req.user.id },
            include: {
                user: { select: { firstName: true, lastName: true, email: true } },
                laboratory: true,
                sector: true,
            },
        });
        if (!delegate)
            return res.status(404).json({ error: "Profil délégué non trouvé" });
        res.json(delegate);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
