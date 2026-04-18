import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Lister tous les laboratoires
router.get("/", authenticate, async (_req, res) => {
  try {
    const labs = await prisma.laboratory.findMany({ orderBy: { name: "asc" } });
    res.json(labs);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer un laboratoire (Super Admin seulement)
router.post("/create", authenticate, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { name, color, emoji, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Le nom est obligatoire" });

    const existing = await prisma.laboratory.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } } });
    if (existing) return res.status(409).json({ error: "Ce laboratoire existe déjà" });

    const lab = await prisma.laboratory.create({
      data: {
        name:        name.trim(),
        color:       color       || null,
        emoji:       emoji       || null,
        description: description || null,
      },
    });
    res.status(201).json({ message: "Laboratoire créé", lab });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprimer un laboratoire (Super Admin seulement)
router.delete("/:id", authenticate, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    // Empêcher la suppression des labos fixes
    const lab = await prisma.laboratory.findUnique({ where: { id } });
    if (!lab) return res.status(404).json({ error: "Laboratoire non trouvé" });
    if (["lic-pharma","croient"].includes(lab.name.toLowerCase()))
      return res.status(403).json({ error: "Les laboratoires LIC PHARMA et CROIENT ne peuvent pas être supprimés" });

    await prisma.laboratory.delete({ where: { id } });
    res.json({ message: "Laboratoire supprimé" });
  } catch (err: any) {
    if (err.code === "P2003") return res.status(409).json({ error: "Ce laboratoire a des données associées. Transférez-les d'abord." });
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
