"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const pdfkit_1 = __importDefault(require("pdfkit"));
const auth_1 = require("../middleware/auth");
const notifications_1 = require("./notifications");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ── Créer un rapport de visite ───────────────────────────────
router.post("/", auth_1.authenticate, (0, auth_1.requireRole)("DELEGATE"), async (req, res) => {
    try {
        const { doctorName, specialty, pharmacyId, productsShown, notes, aiSummary } = req.body;
        if (!doctorName || !notes)
            return res.status(400).json({ error: "Médecin et notes requis" });
        const delegate = await prisma.delegate.findUnique({
            where: { userId: req.user.id },
            include: { user: { select: { firstName: true, lastName: true } } },
        });
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
        // Notification push aux admins
        try {
            await (0, notifications_1.sendPushToAdmins)("📋 Nouveau rapport de visite", `${delegate.user.firstName} ${delegate.user.lastName} — Dr. ${doctorName}`, "/dashboard");
        }
        catch { }
        res.status(201).json({ message: "Rapport enregistré", report });
    }
    catch (err) {
        console.error("Report error:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Liste des rapports ───────────────────────────────────────
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const { delegateId, from, to, page = "1", limit = "20" } = req.query;
        const where = {};
        if (req.user.role === "ADMIN") {
            const labIds = await prisma.laboratory.findMany({
                where: { name: { in: req.user.labs || [] } },
                select: { id: true },
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
                where,
                skip,
                take: parseInt(limit),
                include: {
                    delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
                    pharmacy: { select: { nom: true, ville: true } },
                    laboratory: { select: { name: true } },
                },
                orderBy: { visitDate: "desc" },
            }),
            prisma.visitReport.count({ where }),
        ]);
        res.json({
            reports,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Détail d'un rapport ──────────────────────────────────────
router.get("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const report = await prisma.visitReport.findUnique({
            where: { id: req.params.id },
            include: {
                delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
                pharmacy: { select: { nom: true, ville: true, adresse: true } },
                laboratory: { select: { name: true } },
            },
        });
        if (!report)
            return res.status(404).json({ error: "Rapport non trouvé" });
        res.json(report);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Supprimer un rapport ─────────────────────────────────────
router.delete("/:id", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        await prisma.visitReport.delete({ where: { id: req.params.id } });
        res.json({ message: "Rapport supprimé" });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Export PDF ───────────────────────────────────────────────
router.get("/export/pdf", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const where = {};
        const { from, to, delegateId } = req.query;
        if (req.user.role === "ADMIN") {
            const labIds = await prisma.laboratory.findMany({
                where: { name: { in: req.user.labs || [] } },
                select: { id: true },
            });
            where.laboratoryId = { in: labIds.map((l) => l.id) };
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
        const reports = await prisma.visitReport.findMany({
            where,
            include: {
                delegate: { include: { user: { select: { firstName: true, lastName: true } } } },
                pharmacy: { select: { nom: true, ville: true } },
                laboratory: { select: { name: true } },
            },
            orderBy: { visitDate: "desc" },
            take: 200,
        });
        const doc = new pdfkit_1.default({ margin: 40, size: "A4" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=rapports_${new Date().toISOString().slice(0, 10)}.pdf`);
        doc.pipe(res);
        // En-tête
        doc.rect(0, 0, 612, 80).fill("#0f172a");
        doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text("INOX PHARMA", 40, 20);
        doc.fontSize(12).font("Helvetica").text("Rapports de Visite Médicale", 40, 48);
        doc.fillColor("white").fontSize(9).text(`Exporté le ${new Date().toLocaleDateString("fr-FR")} — ${reports.length} rapport(s)`, 40, 62);
        doc.moveDown(3);
        if (reports.length === 0) {
            doc.fillColor("#374151").fontSize(12).text("Aucun rapport trouvé pour cette période.", { align: "center" });
        }
        reports.forEach((r, i) => {
            if (doc.y > 680)
                doc.addPage();
            // Numéro + Médecin
            doc.fillColor("#0f172a").fontSize(13).font("Helvetica-Bold")
                .text(`${i + 1}. Dr. ${r.doctorName}`);
            // Infos
            doc.fillColor("#374151").fontSize(10).font("Helvetica")
                .text(`Délégué : ${r.delegate.user.firstName} ${r.delegate.user.lastName}   |   Labo : ${r.laboratory.name}`)
                .text(`Date : ${new Date(r.visitDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`);
            if (r.specialty)
                doc.text(`Spécialité : ${r.specialty}`);
            if (r.pharmacy)
                doc.text(`Pharmacie : ${r.pharmacy.nom}${r.pharmacy.ville ? " — " + r.pharmacy.ville : ""}`);
            if (r.productsShown)
                doc.text(`Produits : ${r.productsShown}`);
            doc.moveDown(0.5);
            doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Notes :");
            doc.fillColor("#374151").font("Helvetica").fontSize(10).text(r.notes || "—", { indent: 10 });
            if (r.aiSummary) {
                doc.moveDown(0.3);
                doc.fillColor("#7c3aed").font("Helvetica-Bold").fontSize(10).text("✨ Résumé IA :");
                doc.fillColor("#5b21b6").font("Helvetica").fontSize(10).text(r.aiSummary, { indent: 10 });
            }
            doc.moveDown(0.5);
            doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#e5e7eb").lineWidth(1).stroke();
            doc.moveDown(0.5);
        });
        doc.end();
    }
    catch (err) {
        console.error("PDF error:", err);
        res.status(500).json({ error: "Erreur export PDF" });
    }
});
exports.default = router;
