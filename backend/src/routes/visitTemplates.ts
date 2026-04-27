import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// ── GET tous les templates (accessible par tous les rôles connectés) ─
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const templates = await prisma.visitTemplate.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, category: true,
        description: true, emoji: true, isReport: true,
        fields: true, createdAt: true,
        creator: { select: { firstName: true, lastName: true } },
      },
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── GET templates marqués isReport=true (pour les délégués) ─
router.get("/reports", authenticate, async (req: AuthRequest, res) => {
  try {
    const templates = await prisma.visitTemplate.findMany({
      where:   { isReport: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, category: true,
        description: true, emoji: true, fields: true,
      },
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── POST créer un template (admin/superadmin) ────────────────
router.post("/", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { name, category, description, emoji, isReport, fields } = req.body;
    if (!name) return res.status(400).json({ error: "Nom requis" });

    const template = await prisma.visitTemplate.create({
      data: {
        name:        name.trim(),
        category:    category   || "Autre",
        description: description || "",
        emoji:       emoji      || "📋",
        isReport:    isReport   !== false,
        fields:      Array.isArray(fields) ? fields : [],
        createdBy:   req.user!.id,
      },
    });
    res.status(201).json(template);
  } catch (err) {
    console.error("Template POST error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── PUT modifier un template ─────────────────────────────────
router.put("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { name, category, description, emoji, isReport, fields } = req.body;
    const updated = await prisma.visitTemplate.update({
      where: { id: req.params.id },
      data: {
        name:        name?.trim(),
        category:    category,
        description: description,
        emoji:       emoji,
        isReport:    isReport,
        fields:      Array.isArray(fields) ? fields : undefined,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── DELETE supprimer un template ─────────────────────────────
router.delete("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req, res) => {
  try {
    await prisma.visitTemplate.delete({ where: { id: req.params.id } });
    res.json({ message: "Template supprimé" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;