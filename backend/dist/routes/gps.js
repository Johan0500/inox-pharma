"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get("/positions", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const where = req.user.role === "ADMIN"
            ? { laboratory: { name: { in: req.user.labs || [] } } }
            : {};
        const delegates = await prisma.delegate.findMany({
            where,
            include: {
                user: { select: { firstName: true, lastName: true } },
                sector: { select: { zoneResidence: true } },
                laboratory: { select: { name: true } },
            },
        });
        const positions = delegates.filter((d) => d.lastLat && d.lastLng).map((d) => ({
            id: d.id,
            name: `${d.user.firstName} ${d.user.lastName}`,
            zone: d.zone,
            status: d.status,
            laboratory: d.laboratory.name,
            lat: d.lastLat,
            lng: d.lastLng,
            lastSeen: d.lastSeen,
        }));
        res.json(positions);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
router.get("/history/:delegateId", auth_1.authenticate, async (req, res) => {
    try {
        const { date } = req.query;
        const startOfDay = date ? new Date(date) : new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);
        const logs = await prisma.gPSLog.findMany({
            where: { delegateId: req.params.delegateId, timestamp: { gte: startOfDay, lte: endOfDay } },
            orderBy: { timestamp: "asc" },
        });
        res.json(logs);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
