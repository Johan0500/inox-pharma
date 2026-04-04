import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { sendMorningConnectionReport, scheduleMorningReport } from "../utils/morningReport";

const router = Router();
const prisma = new PrismaClient();

// ── Lire la config ───────────────────────────────────────────
router.get("/", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const config = await prisma.reportConfig.findFirst({
      where:   { isActive: true },
      include: {
        recipients: {
          include: {
            user: {
              select: {
                id: true, firstName: true, lastName: true,
                email: true, role: true,
                adminLabs: { include: { laboratory: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Modifier l'heure d'envoi ─────────────────────────────────
router.patch("/schedule", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const { sendHour, sendMinute } = req.body;
    if (sendHour === undefined || sendMinute === undefined)
      return res.status(400).json({ error: "sendHour et sendMinute requis" });
    if (sendHour < 0 || sendHour > 23 || sendMinute < 0 || sendMinute > 59)
      return res.status(400).json({ error: "Heure invalide" });

    let config = await prisma.reportConfig.findFirst({ where: { isActive: true } });
    if (!config) {
      config = await prisma.reportConfig.create({ data: { sendHour, sendMinute } });
    } else {
      config = await prisma.reportConfig.update({
        where: { id: config.id },
        data:  { sendHour, sendMinute },
      });
    }

    // Replanifier avec la nouvelle heure
    await scheduleMorningReport();
    res.json({ message: `Rapport planifié à ${sendHour}h${String(sendMinute).padStart(2,"0")}`, config });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Ajouter un destinataire ──────────────────────────────────
router.post("/recipients", authenticate, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId requis" });

    let config = await prisma.reportConfig.findFirst({ where: { isActive: true } });
    if (!config) {
      config = await prisma.reportConfig.create({ data: { sendHour: 9, sendMinute: 30 } });
    }

    const recipient = await prisma.reportRecipient.create({
      data: { userId, reportConfigId: config.id },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            adminLabs: { include: { laboratory: { select: { name: true } } } },
          },
        },
      },
    });
    res.status(201).json(recipient);
  } catch (err: any) {
    if (err.code === "P2002")
      return res.status(400).json({ error: "Cet utilisateur est déjà destinataire" });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Supprimer un destinataire ────────────────────────────────
router.delete("/recipients/:userId", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    await prisma.reportRecipient.deleteMany({ where: { userId: req.params.userId } });
    res.json({ message: "Destinataire retiré" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Test immédiat ────────────────────────────────────────────
router.post("/test", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    await sendMorningConnectionReport();
    res.json({ message: "Rapport envoyé ✅" });
  } catch (err) {
    res.status(500).json({ error: "Échec", details: String(err) });
  }
});

export default router;