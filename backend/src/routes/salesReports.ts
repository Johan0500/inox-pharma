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

// Créer ou récupérer un rapport
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
              itemNumber: p.num,
              designation: p.name,
              pght: p.pght,
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

// Mettre à jour une ligne
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

// Soumettre le rapport au Super Admin
router.post("/:id/submit", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const report = await prisma.salesReport.update({
      where: { id: req.params.id },
      data:  { status: "SUBMITTED", submittedAt: new Date() },
      include: { laboratory: true },
    });
    res.json({ message: "Rapport soumis avec succès", report });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Super Admin — voir tous les rapports soumis
router.get("/all", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const { month, year } = req.query as any;
    const where: any = { status: "SUBMITTED" };
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

// Stats par labo pour Super Admin
router.get("/stats", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const { month, year } = req.query as any;
    const where: any = { status: "SUBMITTED" };
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

    const stats = reports.map((r) => {
      const totalVentes = r.lines.reduce((acc, l) =>
        acc + l.copharmedVente + l.laborexVente + l.tedisVente + l.dpciVente, 0
      );
      const totalStocks = r.lines.reduce((acc, l) =>
        acc + l.copharmedStock + l.laborexStock + l.tedisStock + l.dpciStock, 0
      );
      const caTotal = r.lines.reduce((acc, l) => {
        const ventes = l.copharmedVente + l.laborexVente + l.tedisVente + l.dpciVente;
        return acc + (ventes * l.pght);
      }, 0);

      return {
        id:          r.id,
        laboratory:  r.laboratory.name,
        admin:       `${r.admin.firstName} ${r.admin.lastName}`,
        month:       r.month,
        year:        r.year,
        submittedAt: r.submittedAt,
        totalVentes,
        totalStocks,
        caTotal,
        lines:       r.lines,
      };
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;