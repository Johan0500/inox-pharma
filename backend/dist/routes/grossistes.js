"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Lister tous les grossistes
router.get("/", auth_1.authenticate, async (_req, res) => {
    try {
        const grossistes = await prisma.grossiste.findMany({ orderBy: { name: "asc" } });
        res.json(grossistes);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// Créer un grossiste
router.post("/create", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name?.trim())
            return res.status(400).json({ error: "Le nom est obligatoire" });
        const existing = await prisma.grossiste.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } } });
        if (existing)
            return res.status(409).json({ error: "Ce grossiste existe déjà" });
        const grossiste = await prisma.grossiste.create({ data: { name: name.trim() } });
        res.status(201).json({ message: "Grossiste créé", grossiste });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
