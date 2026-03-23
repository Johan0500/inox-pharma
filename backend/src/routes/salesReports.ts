import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

const PRODUCTS = [
  { num: 1,  name: "ARTRINE 1080/180MG PDRE SUSP BUV F/60ML", pght: 1136 },
  { num: 2,  name: "ARTRINE 20MG/120MG CPR B/24",             pght: 1350 },
  { num: 3,  name: "ARTRINE 20MG/120MG CPR B/6",              pght: 340  },
  { num: 4,  name: "ARTRINE 40MG/240MG CPR B/12",             pght: 1350 },
  { num: 5,  name: "ARTRINE 40MG/240MG CPR B/6",              pght: 750  },
  { num: 6,  name: "ARTRINE 60MG/360MG CPR B/6",              pght: 875  },
  { num: 7,  name: "ARTRINE 80/480MG CPR B/6",                pght: 1350 },
  { num: 8,  name: "CLARITOX 500MG CPR SEC B/10",             pght: 2875 },
  { num: 9,  name: "FLOBAXINE 200MG CPR PELL SEC B/10",       pght: 2500 },
  { num: 10, name: "IBUDOL 400MG CPR B/20",                   pght: 835  },
  { num: 11, name: "LIC CIFLOX 500MG CPR PELL B/10",          pght: 1420 },
  { num: 12, name: "LIC DAZOL 400MG CPR B/2",                 pght: 833  },
  { num: 13, name: "LIC NORFLOX 400MG CPR ENR B/10",          pght: 1306 },
  { num: 14, name: "LIC PARAC 500MG CPR B/16",                pght: 218  },
  { num: 15, name: "LIC PIROC 20MG CPR B/10",                 pght: 1270 },
  { num: 16, name: "LICMETHER 40MG SOL INJ AMP/1ML B/6",      pght: 1820 },
  { num: 17, name: "LICMETHER 80MG SOL INJ AMP/1ML B/6",      pght: 1687 },
  { num: 18, name: "METRONYL 500MG CPR B/20",                 pght: 836  },
  { num: 19, name: "ROXINE 150MG CPR PELL SEC B/10",          pght: 2379 },
  { num: 20, name: "SP-LIC 525MG CPR SEC B/3",                pght: 284  },
  { num: 21, name: "VICLINE 200MG CPR PELL SEC B/10",         pght: 795  },
];

// ── Rapport courant ──────────────────────────────────────────
router.get("/current", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  try {
    const now   = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const year  = now.getFullYear();

    const labId = await prisma.adminLaboratory.findFirst({
      where:  { userId: req.user!.id },
      select: { laboratoryId: true },
    });
    if (!labId) return res.status(404).json({ error: "Laboratoire non trouvé" });

    let report = await prisma.salesReport.findFirst({
      where:   { adminId: req.user!.id, month, year },
      include: { lines: { orderBy: { itemNumber: "asc" } }, laboratory: true },
    });

    if (!report) {
      report = await prisma.salesReport.create({
        data: {
          adminId:      req.user!.id,
          laboratoryId: labId.laboratoryId,
          month,
          year,
          lines: {
            create: PRODUCTS.map((p) => ({
              itemNumber:  p.num,
              designation: p.name,
              pght:        p.pght,
            })),
          },
        },
        include: { lines: { orderBy: { itemNumber: "asc" } }, laboratory: true },
      });
    }

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Rapport d'hier (J-1) ────────────────────────────────────
router.get("/yesterday", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const month = `${yesterday.getMonth() + 1}`.padStart(2, "0");
    const year  = yesterday.getFullYear();

    const labId = await prisma.adminLaboratory.findFirst({
      where:  { userId: req.user!.id },
      select: { laboratoryId: true },
    });
    if (!labId) return res.status(404).json({ error: "Laboratoire non trouvé" });

    const report = await prisma.salesReport.findFirst({
      where:   { adminId: req.user!.id, month, year },
      include: { lines: true },
    });

    res.json(report || null);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Mettre à jour une ligne (stock, vente, pght) ─────────────
router.patch("/line/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const line = await prisma.salesReportLine.update({
      where: { id: req.params.id },
      data:  req.body,
    });
    res.json(line);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Ajouter un produit au rapport ────────────────────────────
router.post("/:id/line", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { designation, pght, itemNumber } = req.body;
    if (!designation || !pght)
      return res.status(400).json({ error: "Désignation et PGHT requis" });

    // Trouver le dernier numéro de ligne
    const lastLine = await prisma.salesReportLine.findFirst({
      where:   { reportId: req.params.id },
      orderBy: { itemNumber: "desc" },
    });

    const newItemNumber = itemNumber || (lastLine ? lastLine.itemNumber + 1 : 1);

    const line = await prisma.salesReportLine.create({
      data: {
        reportId:    req.params.id,
        itemNumber:  newItemNumber,
        designation: designation.trim(),
        pght:        parseFloat(pght),
      },
    });
    res.status(201).json(line);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Supprimer une ligne ──────────────────────────────────────
router.delete("/line/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.salesReportLine.delete({ where: { id: req.params.id } });
    res.json({ message: "Ligne supprimée" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Soumettre le rapport (peut être re-soumis après modif) ───
router.post("/:id/submit", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const report = await prisma.salesReport.update({
      where:   { id: req.params.id },
      data:    { status: "SUBMITTED", submittedAt: new Date() },
      include: { laboratory: true },
    });
    res.json({ message: "Rapport soumis avec succès", report });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Remettre en brouillon pour modifications ─────────────────
router.post("/:id/reopen", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const report = await prisma.salesReport.update({
      where: { id: req.params.id },
      data:  { status: "DRAFT", submittedAt: null },
    });
    res.json({ message: "Rapport réouvert", report });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Super Admin — tous les rapports soumis ───────────────────
router.get("/all", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const { month, year } = req.query as any;
    const where: any      = { status: "SUBMITTED" };
    if (month) where.month = month;
    if (year)  where.year  = parseInt(year);

    const reports = await prisma.salesReport.findMany({
      where,
      include: {
        lines:      { orderBy: { itemNumber: "asc" } },
        laboratory: true,
        admin:      { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Super Admin — stats par labo ─────────────────────────────
router.get("/stats", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const { month, year } = req.query as any;
    const where: any      = { status: "SUBMITTED" };
    if (month) where.month = month;
    if (year)  where.year  = parseInt(year);

    const reports = await prisma.salesReport.findMany({
      where,
      include: {
        lines:      true,
        laboratory: true,
        admin:      { select: { firstName: true, lastName: true } },
      },
    });

    const GROSSISTES = ["copharmed", "laborex", "tedis", "dpci"] as const;
    const JOURS      = 18;

    const stats = reports.map((r) => {
      const grossisteStats = GROSSISTES.map((g) => {
        const valStock  = r.lines.reduce((a, l) =>
          a + (l[`${g}Stock` as keyof typeof l] as number || 0) * l.pght, 0);
        const caRealise = r.lines.reduce((a, l) =>
          a + (l[`${g}Vente` as keyof typeof l] as number || 0) * l.pght, 0);
        const moyJour   = JOURS > 0 ? Math.round(caRealise / JOURS) : 0;
        return { grossiste: g, valStock, caRealise, moyJour };
      });

      const totalValStock = grossisteStats.reduce((a, s) => a + s.valStock,  0);
      const totalCA       = grossisteStats.reduce((a, s) => a + s.caRealise, 0);
      const totalMoyJour  = grossisteStats.reduce((a, s) => a + s.moyJour,   0);
      const totalVentes   = r.lines.reduce((a, l) =>
        a + GROSSISTES.reduce((b, g) =>
          b + (l[`${g}Vente` as keyof typeof l] as number || 0), 0), 0);
      const totalStocks   = r.lines.reduce((a, l) =>
        a + GROSSISTES.reduce((b, g) =>
          b + (l[`${g}Stock` as keyof typeof l] as number || 0), 0), 0);

      return {
        id:            r.id,
        laboratory:    r.laboratory.name,
        admin:         `${r.admin.firstName} ${r.admin.lastName}`,
        month:         r.month,
        year:          r.year,
        submittedAt:   r.submittedAt,
        grossisteStats,
        totalValStock,
        totalCA,
        totalMoyJour,
        totalVentes,
        totalStocks,
        lines:         r.lines,
      };
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;