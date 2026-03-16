"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const { type } = req.query;
        const where = type ? { type } : {};
        const sectors = await prisma.sector.findMany({
            where,
            include: { _count: { select: { delegates: true } } },
            orderBy: [{ type: "asc" }, { numero: "asc" }],
        });
        res.json(sectors);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
