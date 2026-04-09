import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt           from "bcryptjs";
import jwt              from "jsonwebtoken";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// ── Login ────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email et mot de passe requis" });

    const user = await prisma.user.findUnique({
      where:   { email: email.toLowerCase().trim() },
      include: {
        adminLabs: { include: { laboratory: true } },
        delegate:  { include: { laboratory: true } },
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });

    if (!user.isActive)
      return res.status(403).json({ error: "Compte désactivé" });

    // Vérifier session existante
    const existing = await prisma.activeSession.findUnique({ where: { userId: user.id } });
    if (existing) {
      // Supprimer l'ancienne session (pas de blocage multi-appareils)
      await prisma.activeSession.delete({ where: { userId: user.id } });
    }

    const labs  = user.adminLabs?.map((al) => al.laboratory.name) || [];
    const token = jwt.sign(
      { id: user.id, role: user.role, labs, delegateId: user.delegate?.id },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    await prisma.activeSession.create({
      data: {
        userId:     user.id,
        token,
        deviceInfo: req.headers["user-agent"] || "Unknown",
        lastActive: new Date(),
      },
    });

    // Historique connexion
    await prisma.loginHistory.create({
      data: {
        userId:     user.id,
        deviceInfo: req.headers["user-agent"] || "Unknown",
        ipAddress:  (req.headers["x-forwarded-for"] as string) || req.ip || "Unknown",
        success:    true,
      },
    });

    res.json({
      token,
      user: {
        id:        user.id,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        role:      user.role,
        isActive:  user.isActive,
        labs,
        delegate: user.delegate
          ? { id: user.delegate.id, zone: user.delegate.zone, status: user.delegate.status }
          : null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Logout ───────────────────────────────────────────────────
router.post("/logout", authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.activeSession.deleteMany({ where: { userId: req.user!.id } });
    res.json({ message: "Déconnexion réussie" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Historique connexions ────────────────────────────────────
router.get("/history", authenticate, async (req: AuthRequest, res) => {
  try {
    const history = await prisma.loginHistory.findMany({
      where:   { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take:    20,
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/history/all", authenticate, async (req: AuthRequest, res) => {
  try {
    if (!["SUPER_ADMIN","ADMIN"].includes(req.user!.role))
      return res.status(403).json({ error: "Accès refusé" });
    const history = await prisma.loginHistory.findMany({
      include: { user: { select: { firstName:true, lastName:true, email:true, role:true } } },
      orderBy: { createdAt: "desc" },
      take:    200,
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
