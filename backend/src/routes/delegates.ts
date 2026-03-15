import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticate, requireRole("SUPER_ADMIN","ADMIN"), async (req: AuthRequest, res) => {
  try {
    const where: any = req.user!.role === "ADMIN"
      ? { laboratory: { name: { in: req.user!.labs || [] } } }
      : {};
    const delegates = await prisma.delegate.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, isActive: true } },
        laboratory: { select: { name: true } },
        sector: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(delegates);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const delegate = await prisma.delegate.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        laboratory: true,
        sector: true,
      },
    });
    if (!delegate) return res.status(404).json({ error: "Profil délégué non trouvé" });
    res.json(delegate);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

export default router;
