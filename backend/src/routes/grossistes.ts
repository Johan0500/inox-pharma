import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Lister tous les grossistes
router.get("/", authenticate, async (_req, res) => {
  try {
    const grossistes = await prisma.grossiste.findMany({ orderBy: { name: "asc" } });
    res.json(grossistes);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer un grossiste
router.post("/create", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Le nom est obligatoire" });

    const existing = await prisma.grossiste.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } } });
    if (existing) return res.status(409).json({ error: "Ce grossiste existe déjà" });

    const grossiste = await prisma.grossiste.create({ data: { name: name.trim() } });
    res.status(201).json({ message: "Grossiste créé", grossiste });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
