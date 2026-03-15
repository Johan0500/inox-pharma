import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// ── LOGIN ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email et mot de passe requis" });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        adminLabs: { include: { laboratory: true } },
        delegate: {
          include: {
            laboratory: true,
            sector: true,
          },
        },
      },
    });

    if (!user)
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });

    if (!user.isActive)
      return res.status(403).json({ error: "Compte désactivé — contactez votre administrateur" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });

    const labs = user.adminLabs.map((al) => al.laboratory.name);

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        labs,
        delegateId: user.delegate?.id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        labs,
        delegate: user.delegate
          ? {
              id: user.delegate.id,
              zone: user.delegate.zone,
              status: user.delegate.status,
              phone: user.delegate.phone,
              laboratory: user.delegate.laboratory.name,
              lastLat: user.delegate.lastLat,
              lastLng: user.delegate.lastLng,
              sector: user.delegate.sector,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── CHANGER MOT DE PASSE ──────────────────────────────────────
router.post("/change-password", authenticate, async (req: AuthRequest, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(401).json({ error: "Ancien mot de passe incorrect" });

    if (newPassword.length < 6)
      return res.status(400).json({ error: "Le mot de passe doit avoir au moins 6 caractères" });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ message: "Mot de passe changé avec succès" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── PROFIL (token check) ──────────────────────────────────────
router.get("/me", authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      adminLabs: { include: { laboratory: true } },
      delegate: { include: { laboratory: true, sector: true } },
    },
  });
  if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
  const labs = user.adminLabs.map((al) => al.laboratory.name);
  res.json({ ...user, password: undefined, labs });
});

export default router;
