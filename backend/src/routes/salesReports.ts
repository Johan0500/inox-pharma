import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import ExcelJS          from "exceljs";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { sendEmail, reportSubmittedEmail }         from "../utils/mailer";
import { notifyAdmins }  from "./notifications"

const router = Router();
const prisma = new PrismaClient();

// ── Constantes ───────────────────────────────────────────────

const GROSSISTES = ["copharmed", "laborex", "tedis", "dpci"] as const;
type Grossiste = typeof GROSSISTES[number];

const JOURS = 18;

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

// ── Helpers ──────────────────────────────────────────────────

function getMonthYear(date = new Date()) {
  return {
    month: `${date.getMonth() + 1}`.padStart(2, "0"),
    year:  date.getFullYear(),
  };
}

function sumVentes(lines: any[]): number {
  return lines.reduce((a, l) =>
    a + GROSSISTES.reduce((b, g) => b + ((l[`${g}Vente`] as number) || 0), 0), 0);
}

function sumCA(lines: any[]): number {
  return lines.reduce((a, l) =>
    a + GROSSISTES.reduce((b, g) => b + ((l[`${g}Vente`] as number) || 0) * l.pght, 0), 0);
}

// ── Rapport courant ──────────────────────────────────────────

router.get("/current", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { month, year } = getMonthYear();

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

// ── Rapport d'hier ───────────────────────────────────────────

router.get("/yesterday", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { month, year } = getMonthYear(yesterday);

    const report = await prisma.salesReport.findFirst({
      where:   { adminId: req.user!.id, month, year },
      include: { lines: true },
    });

    res.json(report ?? null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Mettre à jour une ligne ──────────────────────────────────

router.patch("/line/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const line = await prisma.salesReportLine.update({
      where: { id: req.params.id },
      data:  req.body,
    });
    res.json(line);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Ajouter un produit ───────────────────────────────────────

router.post("/:id/line", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { designation, pght } = req.body;
    if (!designation || !pght)
      return res.status(400).json({ error: "Désignation et PGHT requis" });

    const lastLine = await prisma.salesReportLine.findFirst({
      where:   { reportId: req.params.id },
      orderBy: { itemNumber: "desc" },
    });

    const line = await prisma.salesReportLine.create({
      data: {
        reportId:    req.params.id,
        itemNumber:  lastLine ? lastLine.itemNumber + 1 : 1,
        designation: designation.trim(),
        pght:        parseFloat(pght),
      },
    });

    res.status(201).json(line);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Supprimer une ligne ──────────────────────────────────────

router.delete("/line/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.salesReportLine.delete({ where: { id: req.params.id } });
    res.json({ message: "Ligne supprimée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Soumettre ────────────────────────────────────────────────

router.post("/:id/submit", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  try {
    const report = await prisma.salesReport.update({
      where:   { id: req.params.id },
      data:    { status: "SUBMITTED", submittedAt: new Date() },
      include: { lines: true, laboratory: true },
    });

    // Infos de l'admin connecté
    const admin = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: { firstName: true, lastName: true },
    });
    const adminName = `${admin?.firstName} ${admin?.lastName}`;

    // Calculs globaux
    const totalCA     = sumCA(report.lines);
    const totalVentes = sumVentes(report.lines);

    // Notifications aux super-admins
    const superAdmins = await prisma.user.findMany({
      where:  { role: "SUPER_ADMIN", isActive: true },
      select: { email: true },
    });

    await Promise.all(
      superAdmins.map((sa) =>
        sendEmail(
          sa.email,
          `📊 Nouveau rapport — ${report.laboratory.name.toUpperCase()}`,
          reportSubmittedEmail(
            adminName,
            report.laboratory.name,
            report.month,
            report.year,
            totalCA,
            totalVentes,
          ),
        ),
      ),
    );

    await notifyAdmins(
      "📊 Nouveau rapport soumis",
      `${adminName} a soumis le rapport ${report.laboratory.name} ${report.month}/${report.year}`,
      "/dashboard",
    );

    res.json({ message: "Rapport soumis", report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Réouvrir pour modification ───────────────────────────────

router.post("/:id/reopen", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const report = await prisma.salesReport.update({
      where: { id: req.params.id },
      data:  { status: "DRAFT", submittedAt: null },
    });
    res.json({ message: "Rapport réouvert", report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Export Excel ─────────────────────────────────────────────

router.get("/export/excel", authenticate, requireRole("ADMIN", "SUPER_ADMIN"), async (req: AuthRequest, res) => {
  try {
    const report = await prisma.salesReport.findFirst({
      where:   req.user!.role === "ADMIN" ? { adminId: req.user!.id } : {},
      include: { lines: { orderBy: { itemNumber: "asc" } }, laboratory: true },
      orderBy: { createdAt: "desc" },
    });
    if (!report) return res.status(404).json({ error: "Aucun rapport trouvé" });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Chiffres");

    // Titre
    ws.mergeCells("A1:X1");
    const titleCell = ws.getCell("A1");
    titleCell.value     = `INOX PHARMA — ${report.laboratory.name.toUpperCase()} — ${report.month}/${report.year}`;
    titleCell.font      = { bold: true, size: 14, color: { argb: "FFFFFF" } };
    titleCell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "1E293B" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    // En-têtes
    const headers = ["It.", "DÉSIGNATION", "PGHT"];
    GROSSISTES.forEach((g) =>
      headers.push(`${g.toUpperCase()} STOCK`, `${g.toUpperCase()} VENTE`, "S%", "VALEUR"),
    );
    headers.push("TOT. STOCK", "TOT. VENTE", "CA TOTAL");

    const headerRow = ws.addRow(headers);
    headerRow.font      = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "334155" } };
    headerRow.alignment = { horizontal: "center" };

    // Lignes de données
    report.lines.forEach((l, idx) => {
      const row: any[] = [l.itemNumber, l.designation, l.pght];
      let totStock = 0;
      let totVente = 0;

      GROSSISTES.forEach((g) => {
        const s  = (l as any)[`${g}Stock`] as number || 0;
        const v  = (l as any)[`${g}Vente`] as number || 0;
        const sp = s > 0 ? Math.round((v / s) * 100) : 0;
        row.push(s, v, `${sp}%`, v * l.pght);
        totStock += s;
        totVente += v;
      });

      row.push(totStock, totVente, totVente * l.pght);

      const dataRow = ws.addRow(row);
      if (idx % 2 === 0) {
        dataRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
      }
    });

    // Largeurs colonnes
    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 38;
    ws.getColumn(3).width = 10;
    for (let i = 4; i <= headers.length; i++) ws.getColumn(i).width = 12;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=chiffres_${report.month}_${report.year}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur export Excel" });
  }
});

// ── Super Admin — tous rapports soumis ──────────────────────

router.get("/all", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const { month, year } = req.query as Record<string, string>;
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
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Super Admin — stats par labo ─────────────────────────────

router.get("/stats", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const { month, year } = req.query as Record<string, string>;
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
      const grossisteStats = GROSSISTES.map((g) => {
        const valStock  = r.lines.reduce((a, l) => a + ((l as any)[`${g}Stock`] || 0) * l.pght, 0);
        const caRealise = r.lines.reduce((a, l) => a + ((l as any)[`${g}Vente`] || 0) * l.pght, 0);
        const moyJour   = JOURS > 0 ? Math.round(caRealise / JOURS) : 0;
        return { grossiste: g, valStock, caRealise, moyJour };
      });

      const totalValStock = grossisteStats.reduce((a, s) => a + s.valStock,  0);
      const totalCA       = grossisteStats.reduce((a, s) => a + s.caRealise, 0);
      const totalMoyJour  = grossisteStats.reduce((a, s) => a + s.moyJour,   0);
      const totalVentes   = sumVentes(r.lines);
      const totalStocks   = r.lines.reduce((a, l) =>
        a + GROSSISTES.reduce((b, g) => b + ((l as any)[`${g}Stock`] || 0), 0), 0);

      return {
        id:           r.id,
        laboratory:   r.laboratory.name,
        admin:        `${r.admin.firstName} ${r.admin.lastName}`,
        month:        r.month,
        year:         r.year,
        submittedAt:  r.submittedAt,
        grossisteStats,
        totalValStock,
        totalCA,
        totalMoyJour,
        totalVentes,
        totalStocks,
        lines:        r.lines,
      };
    });

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// ROUTES À AJOUTER dans backend/src/routes/salesReports.ts
// Coller ces 2 routes AVANT la ligne `export default router;`
// ─────────────────────────────────────────────────────────────────────────────

// ── Définir / Modifier l'objectif CA du mois courant ─────────────────────────
//   POST /sales-reports/target-ca
//   Body : { targetCA: number }
//   Crée le rapport du mois si inexistant, puis met à jour targetCA
// ─────────────────────────────────────────────────────────────────────────────
router.post("/target-ca", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { targetCA } = req.body;
    if (typeof targetCA !== "number" || targetCA < 0)
      return res.status(400).json({ error: "targetCA doit être un nombre positif" });

    const { month, year } = getMonthYear();

    const labId = await prisma.adminLaboratory.findFirst({
      where:  { userId: req.user!.id },
      select: { laboratoryId: true },
    });
    if (!labId) return res.status(404).json({ error: "Laboratoire non trouvé" });

    // Upsert du rapport du mois
    let report = await prisma.salesReport.findFirst({
      where: { adminId: req.user!.id, month, year },
    });

    if (!report) {
      report = await prisma.salesReport.create({
        data: {
          adminId:      req.user!.id,
          laboratoryId: labId.laboratoryId,
          month,
          year,
          targetCA,
          targetCASetAt: new Date(),
          lines: {
            create: PRODUCTS.map((p) => ({
              itemNumber:  p.num,
              designation: p.name,
              pght:        p.pght,
            })),
          },
        },
      });
    } else {
      report = await prisma.salesReport.update({
        where: { id: report.id },
        data:  { targetCA, targetCASetAt: new Date() },
      });
    }

    res.json({ success: true, targetCA: report.targetCA });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Tableau de bord Objectif CA ───────────────────────────────────────────────
//   GET /sales-reports/ca-dashboard
//   Retourne toutes les métriques nécessaires à l'onglet Objectif
// ─────────────────────────────────────────────────────────────────────────────
router.get("/ca-dashboard", authenticate, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { month, year } = getMonthYear();

    const report = await prisma.salesReport.findFirst({
      where:   { adminId: req.user!.id, month, year },
      include: { lines: true },
    });

    // ── Calcul du CA réalisé ──────────────────────────────────
    // Les chiffres ont 1 jour de décalage :
    //   les données saisies aujourd'hui = ventes d'hier.
    // Donc le CA "réalisé à date J" = somme des ventes du rapport courant.
    const caRealise = report ? sumCA(report.lines) : 0;
    const targetCA  = report?.targetCA ?? 0;

    // ── Calcul temporel ───────────────────────────────────────
    const today     = new Date();
    const monthNum  = today.getMonth();     // mois JS (0-based)
    const yearNum   = today.getFullYear();

    const totalJoursMois   = new Date(yearNum, monthNum + 1, 0).getDate();

    // Jour "réel" des données = hier (décalage J-1)
    // Ex : si aujourd'hui = 15 avril → données disponibles jusqu'au 14 avril
    const jourDonnees      = today.getDate() - 1;  // nb de jours avec données
    const joursRestants    = totalJoursMois - jourDonnees; // jours à couvrir

    // Rythme actuel : CA / jours avec données
    const rythmeActuel     = jourDonnees > 0
      ? Math.round(caRealise / jourDonnees)
      : 0;

    // CA restant à réaliser
    const caRestant        = Math.max(targetCA - caRealise, 0);

    // CA nécessaire par jour pour atteindre l'objectif sur les jours restants
    const rythmeNecessaire = joursRestants > 0
      ? Math.round(caRestant / joursRestants)
      : caRestant > 0 ? Infinity : 0;

    // Taux de progression
    const progressPct      = targetCA > 0
      ? Math.round((caRealise / targetCA) * 100)
      : null;

    // Projection fin de mois au rythme actuel
    const projectionFinMois = rythmeActuel * totalJoursMois;

    // Statut : EN_AVANCE | EN_RETARD | ATTEINT | PAS_OBJECTIF
    let statut: "EN_AVANCE" | "EN_RETARD" | "ATTEINT" | "PAS_OBJECTIF" = "PAS_OBJECTIF";
    if (targetCA > 0) {
      if (caRealise >= targetCA) {
        statut = "ATTEINT";
      } else {
        // Rythme théorique : targetCA / totalJoursMois
        const rythmeTheorique = targetCA / totalJoursMois;
        statut = rythmeActuel >= rythmeTheorique ? "EN_AVANCE" : "EN_RETARD";
      }
    }

    res.json({
      // Contexte temporel
      today:             today.toISOString().slice(0, 10),
      jourDonnees,            // nbre de jours avec données (J-1)
      joursRestants,          // jours restants dans le mois
      totalJoursMois,

      // Financier
      targetCA,
      caRealise,
      caRestant,
      progressPct,

      // Rythmes
      rythmeActuel,           // FCFA/jour réalisé en moyenne
      rythmeNecessaire,       // FCFA/jour nécessaire pour finir l'objectif
      projectionFinMois,      // projection CA total si on maintient le rythme actuel

      // Synthèse
      statut,
      targetCASetAt: report?.targetCASetAt ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


export default router;