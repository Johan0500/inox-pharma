import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import PDFDocument      from "pdfkit";

const router = Router();
const prisma = new PrismaClient();

router.post("/", authenticate, requireRole("DELEGATE"), async (req: AuthRequest, res) => {
  try {
    const { doctorName, specialty, pharmacyId, productsShown, notes, aiSummary } = req.body;
    if (!doctorName || !notes)
      return res.status(400).json({ error: "Médecin et notes requis" });

    const delegate = await prisma.delegate.findUnique({ where: { userId: req.user!.id } });
    if (!delegate) return res.status(404).json({ error: "Profil délégué non trouvé" });

    const report = await prisma.visitReport.create({
      data: {
        delegateId:    delegate.id,
        laboratoryId:  delegate.laboratoryId,
        doctorName:    doctorName.trim(),
        specialty:     specialty    || null,
        pharmacyId:    pharmacyId   || null,
        productsShown: productsShown || null,
        notes,
        aiSummary:     aiSummary    || null,
      },
      include: {
        delegate:   { include: { user: { select: { firstName: true, lastName: true } } } },
        pharmacy:   { select: { nom: true, ville: true } },
        laboratory: { select: { name: true } },
      },
    });
    res.status(201).json({ message: "Rapport enregistré", report });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { delegateId, from, to, page = "1", limit = "20" } = req.query as any;
    const where: any = {};

    if (req.user!.role === "ADMIN") {
      const labIds = await prisma.laboratory.findMany({
        where:  { name: { in: req.user!.labs || [] } },
        select: { id: true },
      });
      where.laboratoryId = { in: labIds.map((l) => l.id) };
    }
    if (req.user!.role === "DELEGATE") {
      const delegate = await prisma.delegate.findUnique({ where: { userId: req.user!.id } });
      if (delegate) where.delegateId = delegate.id;
    }
    if (delegateId) where.delegateId = delegateId;
    if (from || to) {
      where.visitDate = {};
      if (from) where.visitDate.gte = new Date(from);
      if (to)   where.visitDate.lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reports, total] = await Promise.all([
      prisma.visitReport.findMany({
        where, skip, take: parseInt(limit),
        include: {
          delegate:   { include: { user: { select: { firstName: true, lastName: true } } } },
          pharmacy:   { select: { nom: true, ville: true } },
          laboratory: { select: { name: true } },
        },
        orderBy: { visitDate: "desc" },
      }),
      prisma.visitReport.count({ where }),
    ]);
    res.json({ reports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Export PDF
router.get("/export/pdf", authenticate, requireRole("SUPER_ADMIN","ADMIN"), async (req: AuthRequest, res) => {
  try {
    const where: any = {};
    if (req.user!.role === "ADMIN") {
      const labIds = await prisma.laboratory.findMany({
        where:  { name: { in: req.user!.labs || [] } },
        select: { id: true },
      });
      where.laboratoryId = { in: labIds.map((l) => l.id) };
    }

    const reports = await prisma.visitReport.findMany({
      where,
      include: {
        delegate:   { include: { user: { select: { firstName: true, lastName: true } } } },
        pharmacy:   { select: { nom: true, ville: true } },
        laboratory: { select: { name: true } },
      },
      orderBy: { visitDate: "desc" },
      take:    100,
    });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=rapports_${new Date().toISOString().slice(0,10)}.pdf`);
    doc.pipe(res);

    // En-tête
    doc.fontSize(20).font("Helvetica-Bold").text("INOX PHARMA", { align: "center" });
    doc.fontSize(14).font("Helvetica").text("Rapports de Visite Médicale", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("gray").text(`Exporté le ${new Date().toLocaleDateString("fr-FR")} — ${reports.length} rapports`, { align: "center" });
    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#1E293B").stroke();
    doc.moveDown(1);

    reports.forEach((r, i) => {
      if (doc.y > 700) doc.addPage();

      doc.fillColor("#1E293B").fontSize(12).font("Helvetica-Bold")
         .text(`${i+1}. Dr. ${r.doctorName}`);
      doc.fillColor("#374151").fontSize(10).font("Helvetica")
         .text(`Délégué : ${r.delegate.user.firstName} ${r.delegate.user.lastName}   |   Laboratoire : ${r.laboratory.name}`)
         .text(`Date : ${new Date(r.visitDate).toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" })}`);
      if (r.specialty)      doc.text(`Spécialité : ${r.specialty}`);
      if (r.pharmacy)       doc.text(`Pharmacie : ${r.pharmacy.nom}${r.pharmacy.ville ? " — " + r.pharmacy.ville : ""}`);
      if (r.productsShown)  doc.text(`Produits présentés : ${r.productsShown}`);

      doc.moveDown(0.5);
      doc.fillColor("#1E293B").font("Helvetica-Bold").text("Notes de visite :");
      doc.fillColor("#374151").font("Helvetica").text(r.notes || "—");

      if (r.aiSummary) {
        doc.moveDown(0.3);
        doc.fillColor("#5B21B6").font("Helvetica-Bold").text("Résumé IA (Gemini) :");
        doc.fillColor("#374151").font("Helvetica").text(r.aiSummary);
      }

      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#E5E7EB").stroke();
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur export PDF" });
  }
});

export default router;
