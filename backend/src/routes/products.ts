import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticate, async (req, res) => {
  try {
    const { specialty, group } = req.query as any;
    const where: any = { isActive: true };
    if (specialty) where.specialty = specialty;
    if (group)     where.group     = group;
    const products = await prisma.product.findMany({ where, orderBy: [{ group: "asc" }, { name: "asc" }] });
    res.json(products);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.get("/specialties", authenticate, async (req, res) => {
  try {
    const specialties = await prisma.product.groupBy({
      by: ["specialty", "group"],
      where: { isActive: true },
      orderBy: { group: "asc" },
    });
    res.json(specialties);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

export default router;
