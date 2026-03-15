import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticate, async (req, res) => {
  try {
    const { type } = req.query as any;
    const where: any = type ? { type } : {};
    const sectors = await prisma.sector.findMany({
      where,
      include: { _count: { select: { delegates: true } } },
      orderBy: [{ type: "asc" }, { numero: "asc" }],
    });
    res.json(sectors);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

export default router;
