"use strict";
// ═══════════════════════════════════════════════════════════════
// TOUTES LES ROUTES RESTANTES — UN SEUL FICHIER POUR FACILITER
// LA LECTURE. Dans votre projet, copiez chaque section dans son
// propre fichier comme indiqué par le commentaire de titre.
// ═══════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.sectorsRouter = exports.laboratoriesRouter = exports.grossistesRouter = exports.delegatesRouter = exports.statsRouter = exports.planningRouter = exports.productsRouter = exports.gpsRouter = exports.reportsRouter = void 0;
// ── FICHIER : src/routes/reports.ts ──────────────────────────
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
exports.reportsRouter = (0, express_1.Router)();
const p1 = new client_1.PrismaClient();
exports.reportsRouter.post("/", auth_1.authenticate, (0, auth_1.requireRole)("DELEGATE"), async (req, res) => {
    try {
        const { doctorName, specialty, pharmacyId, productsShown, notes, aiSummary } = req.body;
        if (!doctorName || !notes)
            return res.status(400).json({ error: "Médecin et notes requis" });
        const delegate = await p1.delegate.findUnique({ where: { userId: req.user.id } });
        if (!delegate)
            return res.status(404).json({ error: "Profil délégué non trouvé" });
        const report = await p1.visitReport.create({
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
exports.reportsRouter.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const { delegateId, from, to, page = "1", limit = "20" } = req.query;
        const where = {};
        if (req.user.role === "ADMIN") {
            const labIds = await p1.laboratory.findMany({
                where: { name: { in: req.user.labs || [] } },
                select: { id: true },
            });
            where.laboratoryId = { in: labIds.map((l) => l.id) };
        }
        if (req.user.role === "DELEGATE") {
            const delegate = await p1.delegate.findUnique({ where: { userId: req.user.id } });
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
            p1.visitReport.findMany({
                where, skip, take: parseInt(limit),
                include: {
                    delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
                    pharmacy: { select: { nom: true, ville: true } },
                    laboratory: { select: { name: true } },
                },
                orderBy: { visitDate: "desc" },
            }),
            p1.visitReport.count({ where }),
        ]);
        res.json({ reports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── FICHIER : src/routes/gps.ts ───────────────────────────────
const express_2 = require("express");
const client_2 = require("@prisma/client");
const auth_2 = require("../middleware/auth");
exports.gpsRouter = (0, express_2.Router)();
const p2 = new client_2.PrismaClient();
exports.gpsRouter.get("/positions", auth_2.authenticate, (0, auth_2.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const where = req.user.role === "ADMIN"
            ? { laboratory: { name: { in: req.user.labs || [] } } }
            : {};
        const delegates = await p2.delegate.findMany({
            where,
            include: {
                user: { select: { firstName: true, lastName: true } },
                sector: { select: { zoneResidence: true } },
                laboratory: { select: { name: true } },
            },
        });
        const positions = delegates
            .filter((d) => d.lastLat && d.lastLng)
            .map((d) => ({
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
exports.gpsRouter.get("/history/:delegateId", auth_2.authenticate, async (req, res) => {
    try {
        const { date } = req.query;
        const startOfDay = date ? new Date(date) : new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);
        const logs = await p2.gPSLog.findMany({
            where: {
                delegateId: req.params.delegateId,
                timestamp: { gte: startOfDay, lte: endOfDay },
            },
            orderBy: { timestamp: "asc" },
        });
        res.json(logs);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── FICHIER : src/routes/products.ts ─────────────────────────
const express_3 = require("express");
const client_3 = require("@prisma/client");
const auth_3 = require("../middleware/auth");
exports.productsRouter = (0, express_3.Router)();
const p3 = new client_3.PrismaClient();
exports.productsRouter.get("/", auth_3.authenticate, async (req, res) => {
    try {
        const { specialty, group } = req.query;
        const where = { isActive: true };
        if (specialty)
            where.specialty = specialty;
        if (group)
            where.group = group;
        const products = await p3.product.findMany({ where, orderBy: [{ group: "asc" }, { name: "asc" }] });
        res.json(products);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.productsRouter.get("/specialties", auth_3.authenticate, async (req, res) => {
    try {
        const specialties = await p3.product.groupBy({
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
// ── FICHIER : src/routes/planning.ts ─────────────────────────
const express_4 = require("express");
const client_4 = require("@prisma/client");
const auth_4 = require("../middleware/auth");
exports.planningRouter = (0, express_4.Router)();
const p4 = new client_4.PrismaClient();
exports.planningRouter.get("/", auth_4.authenticate, async (req, res) => {
    try {
        const { delegateId, zone, month } = req.query;
        const where = {};
        if (req.user.role === "DELEGATE" && req.user.delegateId)
            where.delegateId = req.user.delegateId;
        else if (delegateId)
            where.delegateId = delegateId;
        if (zone)
            where.zone = { contains: zone };
        if (month)
            where.month = month;
        const plans = await p4.weeklyPlanning.findMany({
            where,
            orderBy: [{ zone: "asc" }, { weekNumber: "asc" }],
            include: {
                delegate: {
                    include: { user: { select: { firstName: true, lastName: true } } },
                },
            },
        });
        res.json(plans);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── FICHIER : src/routes/stats.ts ────────────────────────────
const express_5 = require("express");
const client_5 = require("@prisma/client");
const auth_5 = require("../middleware/auth");
exports.statsRouter = (0, express_5.Router)();
const p5 = new client_5.PrismaClient();
exports.statsRouter.get("/dashboard", auth_5.authenticate, (0, auth_5.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const [totalDelegates, activeDelegates, totalReports, totalPharmacies, recentReports] = await Promise.all([
            p5.delegate.count(),
            p5.delegate.count({ where: { status: { not: "INACTIF" } } }),
            p5.visitReport.count(),
            p5.pharmacy.count({ where: { isActive: true } }),
            p5.visitReport.findMany({
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
exports.statsRouter.get("/reports-by-delegate", auth_5.authenticate, (0, auth_5.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const data = await p5.visitReport.groupBy({
            by: ["delegateId"],
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
            take: 10,
        });
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── FICHIER : src/routes/delegates.ts ────────────────────────
const express_6 = require("express");
const client_6 = require("@prisma/client");
const auth_6 = require("../middleware/auth");
exports.delegatesRouter = (0, express_6.Router)();
const p6 = new client_6.PrismaClient();
exports.delegatesRouter.get("/", auth_6.authenticate, (0, auth_6.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const where = req.user.role === "ADMIN"
            ? { laboratory: { name: { in: req.user.labs || [] } } }
            : {};
        const delegates = await p6.delegate.findMany({
            where,
            include: {
                user: { select: { firstName: true, lastName: true, email: true, isActive: true } },
                laboratory: { select: { name: true } },
                sector: true,
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(delegates);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.delegatesRouter.get("/me", auth_6.authenticate, async (req, res) => {
    try {
        const delegate = await p6.delegate.findUnique({
            where: { userId: req.user.id },
            include: {
                user: { select: { firstName: true, lastName: true, email: true } },
                laboratory: true,
                sector: true,
                planning: { where: { month: new Date().toISOString().slice(0, 7) } },
            },
        });
        if (!delegate)
            return res.status(404).json({ error: "Profil délégué non trouvé" });
        res.json(delegate);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── FICHIER : src/routes/grossistes.ts ───────────────────────
const express_7 = require("express");
const client_7 = require("@prisma/client");
const auth_7 = require("../middleware/auth");
exports.grossistesRouter = (0, express_7.Router)();
const p7 = new client_7.PrismaClient();
exports.grossistesRouter.get("/", auth_7.authenticate, async (req, res) => {
    try {
        const grossistes = await p7.grossiste.findMany({
            include: { _count: { select: { pharmacies: true } } },
        });
        res.json(grossistes);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── FICHIER : src/routes/laboratories.ts ─────────────────────
const express_8 = require("express");
const client_8 = require("@prisma/client");
const auth_8 = require("../middleware/auth");
exports.laboratoriesRouter = (0, express_8.Router)();
const p8 = new client_8.PrismaClient();
exports.laboratoriesRouter.get("/", auth_8.authenticate, async (req, res) => {
    try {
        const labs = await p8.laboratory.findMany({
            include: { _count: { select: { delegates: true, reports: true } } },
        });
        res.json(labs);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── FICHIER : src/routes/sectors.ts ──────────────────────────
const express_9 = require("express");
const client_9 = require("@prisma/client");
const auth_9 = require("../middleware/auth");
exports.sectorsRouter = (0, express_9.Router)();
const p9 = new client_9.PrismaClient();
exports.sectorsRouter.get("/", auth_9.authenticate, async (req, res) => {
    try {
        const { type } = req.query;
        const where = type ? { type } : {};
        const sectors = await p9.sector.findMany({
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
