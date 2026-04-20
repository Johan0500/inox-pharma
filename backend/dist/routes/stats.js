"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ── Helper : construit les filtres lab selon le rôle ─────────
async function buildLabFilter(req) {
    const labName = req.headers["x-lab"];
    const labWhere = {};
    if (req.user.role === "SUPER_ADMIN" && labName && labName !== "all") {
        const lab = await prisma.laboratory.findFirst({ where: { name: labName } });
        if (lab)
            labWhere.laboratoryId = lab.id;
    }
    else if (req.user.role === "ADMIN") {
        const labs = await prisma.laboratory.findMany({
            where: { name: { in: req.user.labs || [] } },
            select: { id: true },
        });
        labWhere.laboratoryId = { in: labs.map((l) => l.id) };
    }
    return labWhere;
}
// ── Dashboard principal (avec filtre lab + byLab) ────────────
router.get("/", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const labWhere = await buildLabFilter(req);
        const delegateWhere = labWhere.laboratoryId
            ? { laboratoryId: labWhere.laboratoryId }
            : {};
        const [totalDelegates, activeDelegates, totalReports, totalPharmacies, recentReports,] = await Promise.all([
            prisma.delegate.count({ where: delegateWhere }),
            prisma.delegate.count({ where: { ...delegateWhere, status: { not: "INACTIF" } } }),
            prisma.visitReport.count({ where: labWhere }),
            prisma.pharmacy.count({ where: { isActive: true } }),
            prisma.visitReport.findMany({
                where: labWhere,
                include: {
                    delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
                    pharmacy: { select: { nom: true } },
                    laboratory: { select: { name: true } },
                },
                orderBy: { visitDate: "desc" },
                take: 5,
            }),
        ]);
        // Vue globale SUPER_ADMIN sans filtre → comparaison par labo
        let byLab = null;
        if (!labWhere.laboratoryId && req.user.role === "SUPER_ADMIN") {
            const labs = await prisma.laboratory.findMany({ select: { id: true, name: true } });
            byLab = await Promise.all(labs.map(async (lab) => {
                const [delegates, active, reports] = await Promise.all([
                    prisma.delegate.count({ where: { laboratoryId: lab.id } }),
                    prisma.delegate.count({ where: { laboratoryId: lab.id, status: { not: "INACTIF" } } }),
                    prisma.visitReport.count({ where: { laboratoryId: lab.id } }),
                ]);
                return { name: lab.name, delegates, active, reports };
            }));
        }
        res.json({ totalDelegates, activeDelegates, totalReports, totalPharmacies, recentReports, byLab });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Dashboard legacy /dashboard (alias sans filtre lab) ──────
router.get("/dashboard", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const [totalDelegates, activeDelegates, totalReports, totalPharmacies, recentReports,] = await Promise.all([
            prisma.delegate.count(),
            prisma.delegate.count({ where: { status: { not: "INACTIF" } } }),
            prisma.visitReport.count(),
            prisma.pharmacy.count({ where: { isActive: true } }),
            prisma.visitReport.findMany({
                take: 5,
                orderBy: { visitDate: "desc" },
                include: {
                    delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
                    pharmacy: { select: { nom: true } },
                    laboratory: { select: { name: true } },
                },
            }),
        ]);
        res.json({ totalDelegates, activeDelegates, totalReports, totalPharmacies, recentReports });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
