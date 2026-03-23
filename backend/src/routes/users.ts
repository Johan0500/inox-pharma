import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt           from "bcryptjs";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticate, requireRole("SUPER_ADMIN","ADMIN"), async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        adminLabs:      { include: { laboratory: true } },
        delegate:       { include: { laboratory: true, sector: true } },
        activeSessions: { select: { lastActive: true, deviceInfo: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/", authenticate, requireRole("SUPER_ADMIN","ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { email, password, firstName, lastName, role, labs, zone, phone } = req.body;
    if (!email || !password || !firstName || !lastName)
      return res.status(400).json({ error: "Champs obligatoires manquants" });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(400).json({ error: "Email déjà utilisé" });

    const labsToUse = labs || [];
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email:       email.toLowerCase().trim(),
        password:    hash,
        firstName:   firstName.trim(),
        lastName:    lastName.trim(),
        role:        role || "DELEGATE",
        createdById: req.user!.id,
      },
    });

    if (role === "DELEGATE" || !role) {
      const lab = labsToUse[0]
        ? await prisma.laboratory.findUnique({ where: { name: labsToUse[0] } })
        : null;
      if (lab) {
        await prisma.delegate.create({
          data: { userId: user.id, laboratoryId: lab.id, zone: zone || "Non défini", phone: phone || null },
        });
      }
    } else if (role === "ADMIN" && labsToUse.length > 0) {
      for (const labName of labsToUse) {
        const lab = await prisma.laboratory.findUnique({ where: { name: labName } });
        if (lab) {
          await prisma.adminLaboratory.create({ data: { userId: user.id, laboratoryId: lab.id } });
        }
      }
    }

    res.status(201).json({ message: "Utilisateur créé", user });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Changer son propre mot de passe
router.patch("/me/password", authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "Ancien et nouveau mot de passe requis" });
    if (newPassword.length < 6)
      return res.status(400).json({ error: "Le nouveau mot de passe doit avoir au moins 6 caractères" });

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(401).json({ error: "Mot de passe actuel incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user!.id }, data: { password: hash } });
    res.json({ message: "Mot de passe changé avec succès" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Activer/désactiver un compte
router.patch("/:id/toggle", authenticate, requireRole("SUPER_ADMIN","ADMIN"), async (req, res) => {
  try {
    const user    = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data:  { isActive: !user.isActive },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Déconnecter un utilisateur spécifique
router.delete("/:id/session", authenticate, requireRole("SUPER_ADMIN","ADMIN"), async (req, res) => {
  try {
    await prisma.activeSession.deleteMany({ where: { userId: req.params.id } });
    res.json({ message: "Utilisateur déconnecté" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Déconnecter TOUS les utilisateurs
router.delete("/sessions/all", authenticate, requireRole("SUPER_ADMIN","ADMIN"), async (req: AuthRequest, res) => {
  try {
    await prisma.activeSession.deleteMany({ where: { userId: { not: req.user!.id } } });
    res.json({ message: "Tous les utilisateurs déconnectés" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
