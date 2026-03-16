"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get("/dashboard", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const [totalDelegates, activeDelegates, totalReports, totalPharmacies, recentReports] = await Promise.all([
            prisma.delegate.count(),
            prisma.delegate.count({ where: { status: { not: "INACTIF" } } }),
            prisma.visitReport.count(),
            prisma.pharmacy.count({ where: { isActive: true } }),
            prisma.visitReport.findMany({
                take: 5,
                orderBy: { visitDate: "desc" },
                include: {
                    delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
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
