import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticate, async (req, res) => {
  try {
    const grossistes = await prisma.grossiste.findMany({
      include: { _count: { select: { pharmacies: true } } },
    });
    res.json(grossistes);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

export default router;
