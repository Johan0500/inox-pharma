"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const { specialty, group } = req.query;
        const where = { isActive: true };
        if (specialty)
            where.specialty = specialty;
        if (group)
            where.group = group;
        const products = await prisma.product.findMany({ where, orderBy: [{ group: "asc" }, { name: "asc" }] });
        res.json(products);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
router.get("/specialties", auth_1.authenticate, async (req, res) => {
    try {
        const specialties = await prisma.product.groupBy({
            by: ["specialty", "group"],
            where: { isActive: true },
            orderBy: { group: "asc" },
        });
        res.json(specialties);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
