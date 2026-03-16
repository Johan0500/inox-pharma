"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.post("/", auth_1.authenticate, (0, auth_1.requireRole)("DELEGATE"), async (req, res) => {
    try {
        const { doctorName, specialty, pharmacyId, productsShown, notes, aiSummary } = req.body;
        if (!doctorName || !notes)
            return res.status(400).json({ error: "Médecin et notes requis" });
        const delegate = await prisma.delegate.findUnique({ where: { userId: req.user.id } });
        if (!delegate)
            return res.status(404).json({ error: "Profil délégué non trouvé" });
        const report = await prisma.visitReport.create({
            data: {
                delegateId: delegate.id,
                laboratoryId: delegate.laboratoryId,
                doctorName: doctorName.trim(),
                specialty: specialty || null,
                pharmacyId: pharmacyId || null,
                productsShown: productsShown || null,
                notes,
                aiSummary: aiSummary || null,
            },
            include: {
                delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
                pharmacy: { select: { nom: true, ville: true } },
                laboratory: { select: { name: true } },
            },
        });
        res.status(201).json({ message: "Rapport enregistré", report });
    }
    catch (err) {
        console.error("Create report error:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const { delegateId, from, to, page = "1", limit = "20" } = req.query;
        const where = {};
        if (req.user.role === "ADMIN") {
            const labIds = await prisma.laboratory.findMany({
                where: { name: { in: req.user.labs || [] } }, select: { id: true },
            });
            where.laboratoryId = { in: labIds.map((l) => l.id) };
        }
        if (req.user.role === "DELEGATE") {
            const delegate = await prisma.delegate.findUnique({ where: { userId: req.user.id } });
            if (delegate)
                where.delegateId = delegate.id;
        }
        if (delegateId)
            where.delegateId = delegateId;
        if (from || to) {
            where.visitDate = {};
            if (from)
                where.visitDate.gte = new Date(from);
            if (to)
                where.visitDate.lte = new Date(to);
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [reports, total] = await Promise.all([
            prisma.visitReport.findMany({
                where, skip, take: parseInt(limit),
                include: {
                    delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
                    pharmacy: { select: { nom: true, ville: true } },
                    laboratory: { select: { name: true } },
                },
                orderBy: { visitDate: "desc" },
            }),
            prisma.visitReport.count({ where }),
        ]);
        res.json({ reports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
