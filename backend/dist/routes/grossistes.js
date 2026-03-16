"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const grossistes = await prisma.grossiste.findMany({
            include: { _count: { select: { pharmacies: true } } },
        });
        res.json(grossistes);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
