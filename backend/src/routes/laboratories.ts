import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticate, async (req, res) => {
  try {
    const labs = await prisma.laboratory.findMany({
      include: { _count: { select: { delegates: true, reports: true } } },
    });
    res.json(labs);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

export default router;
