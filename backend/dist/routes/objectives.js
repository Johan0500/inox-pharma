"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ── Helpers ──────────────────────────────────────────────────
function getCurrentMonthYear() {
    const now = new Date();
    return {
        month: `${now.getMonth() + 1}`.padStart(2, "0"),
        year: now.getFullYear(),
    };
}
function parseIntOrZero(value) {
    return parseInt(value) || 0;
}
function getMonthBounds(year, month) {
    const m = parseInt(month) - 1;
    return {
        startOfMonth: new Date(year, m, 1),
        endOfMonth: new Date(year, m + 1, 0, 23, 59, 59),
    };
}
// ── Créer ou mettre à jour un objectif ───────────────────────
router.post("/", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const { delegateId, month, year, targetVisits, targetReports, targetPharmacies } = req.body;
        if (!delegateId || !month || !year)
            return res.status(400).json({ error: "Délégué, mois et année requis" });
        const parsedYear = parseInt(year);
        const data = {
            targetVisits: parseIntOrZero(targetVisits),
            targetReports: parseIntOrZero(targetReports),
            targetPharmacies: parseIntOrZero(targetPharmacies),
            createdById: req.user.id,
        };
        const objective = await prisma.delegateObjective.upsert({
            where: { delegateId_month_year: { delegateId, month, year: parsedYear } },
            update: data,
            create: { delegateId, month, year: parsedYear, ...data },
        });
        res.json(objective);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Récupérer les objectifs avec réalisations ────────────────
router.get("/", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const defaults = getCurrentMonthYear();
        const month = req.query.month || defaults.month;
        const year = parseInt(req.query.year) || defaults.year;
        const { startOfMonth, endOfMonth } = getMonthBounds(year, month);
        const delegates = await prisma.delegate.findMany({
            include: {
                user: { select: { firstName: true, lastName: true } },
                laboratory: { select: { name: true } },
                sector: { select: { zoneResidence: true } },
                objectives: { where: { month, year } },
            },
        });
        const results = await Promise.all(delegates.map(async (d) => {
            const dateFilter = { gte: startOfMonth, lte: endOfMonth };
            // visits et pharmacies en parallèle
            const [visits, pharmacies] = await Promise.all([
                prisma.visitReport.count({
                    where: { delegateId: d.id, visitDate: dateFilter },
                }),
                prisma.visitReport.groupBy({
                    by: ["pharmacyId"],
                    where: { delegateId: d.id, visitDate: dateFilter, pharmacyId: { not: null } },
                }),
            ]);
            const pharmacyCount = pharmacies.length;
            const objective = d.objectives[0] ?? null;
            return {
                delegate: {
                    id: d.id,
                    name: `${d.user.firstName} ${d.user.lastName}`,
                    zone: d.zone,
                    laboratory: d.laboratory.name,
                    status: d.status,
                },
                objective,
                achieved: {
                    visits,
                    pharmacies: pharmacyCount,
                },
                progress: objective
                    ? {
                        visits: objective.targetVisits > 0 ? Math.round((visits / objective.targetVisits) * 100) : null,
                        pharmacies: objective.targetPharmacies > 0 ? Math.round((pharmacyCount / objective.targetPharmacies) * 100) : null,
                    }
                    : null,
            };
        }));
        res.json({ month, year, data: results });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Objectifs d'un délégué spécifique ───────────────────────
router.get("/:delegateId", auth_1.authenticate, async (req, res) => {
    try {
        const defaults = getCurrentMonthYear();
        const month = req.query.month || defaults.month;
        const year = parseInt(req.query.year) || defaults.year;
        const objective = await prisma.delegateObjective.findUnique({
            where: { delegateId_month_year: { delegateId: req.params.delegateId, month, year } },
        });
        res.json(objective ?? null);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
