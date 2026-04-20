"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET /products — liste avec filtre labo optionnel
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const { specialty, group, laboratory } = req.query;
        const where = { isActive: true };
        if (specialty)
            where.specialty = specialty;
        if (group)
            where.group = group;
        const products = await prisma.product.findMany({
            where,
            orderBy: [{ group: "asc" }, { name: "asc" }],
        });
        // Enrichir avec le nom du labo depuis le group
        res.json(products.map(p => ({
            ...p,
            laboratory: { name: p.group },
        })));
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// GET /products/specialties
router.get("/specialties", auth_1.authenticate, async (_req, res) => {
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
// POST /products — créer un produit (admin/super admin)
router.post("/", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const { name, specialty, laboratory } = req.body;
        if (!name?.trim())
            return res.status(400).json({ error: "Le nom est obligatoire" });
        if (!specialty?.trim())
            return res.status(400).json({ error: "La spécialité est obligatoire" });
        // Pour les admins, vérifier qu'ils n'ajoutent que pour leur labo
        const labName = laboratory?.trim() || "croient";
        if (req.user.role === "ADMIN") {
            const allowed = (req.user.labs || []).some((l) => l.toLowerCase() === labName.toLowerCase());
            if (!allowed)
                return res.status(403).json({ error: "Vous ne pouvez ajouter des produits que pour votre laboratoire" });
        }
        const product = await prisma.product.create({
            data: {
                name: name.trim(),
                specialty: specialty.trim(),
                group: labName,
                isActive: true,
            },
        });
        res.status(201).json({ message: "Produit ajouté", product });
    }
    catch (err) {
        if (err.code === "P2002")
            return res.status(409).json({ error: "Ce produit existe déjà" });
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
