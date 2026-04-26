import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt           from "bcryptjs";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

const ALLOWED_LABS = ["lic-pharma", "croient"];

// ── Routes fixes (AVANT les routes avec :id) ─────────────────

// Liste des utilisateurs
router.get("/", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const where: any = {};
    if (req.user!.role === "ADMIN") {
      const labIds = await prisma.laboratory.findMany({
        where:  { name: { in: req.user!.labs || [] } },
        select: { id: true },
      });
      where.OR = [
        { adminLabs: { some: { laboratoryId: { in: labIds.map((l) => l.id) } } } },
        { delegate:  { laboratoryId: { in: labIds.map((l) => l.id) } } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      include: {
        adminLabs:      { include: { laboratory: true } },
        delegate:       { include: { laboratory: true, sector: true } },
        activeSessions: { select: { lastActive: true, deviceInfo: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer un utilisateur
router.post("/", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { email, password, firstName, lastName, role, labs, zone, phone } = req.body;

    if (!email || !password || !firstName || !lastName)
      return res.status(400).json({ error: "Champs obligatoires manquants" });
    if (password.length < 6)
      return res.status(400).json({ error: "Le mot de passe doit avoir au moins 6 caractères" });
    if (req.user!.role === "ADMIN" && role === "SUPER_ADMIN")
      return res.status(403).json({ error: "Accès refusé" });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return res.status(400).json({ error: "Cet email est déjà utilisé" });

    const labsToUse = (labs || []).filter((l: string) => ALLOWED_LABS.includes(l));
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

    if ((role === "DELEGATE" || !role) && labsToUse.length > 0) {
      const lab = await prisma.laboratory.findFirst({
        where: { name: { equals: labsToUse[0], mode: "insensitive" } },
      });
      if (lab) {
        await prisma.delegate.create({
          data: {
            userId:       user.id,
            laboratoryId: lab.id,
            zone:         zone?.trim() || "Non défini",
            phone:        phone?.trim() || null,
          },
        });
      }
    }

    if (role === "ADMIN" && labsToUse.length > 0) {
      for (const labName of labsToUse) {
        const lab = await prisma.laboratory.findFirst({
          where: { name: { equals: labName, mode: "insensitive" } },
        });
        if (lab) {
          await prisma.adminLaboratory.create({ data: { userId: user.id, laboratoryId: lab.id } });
        }
      }
    }

    res.status(201).json({ message: "Utilisateur créé avec succès", user });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Erreur serveur lors de la création" });
  }
});

// Mettre à jour son profil
router.patch("/me/profile", authenticate, async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, avatar } = req.body;
    const data: any = {};
    if (firstName?.trim()) data.firstName = firstName.trim();
    if (lastName?.trim())  data.lastName  = lastName.trim();
    if (avatar !== undefined) data.avatar = avatar;

    const updated = await prisma.user.update({
      where:  { id: req.user!.id },
      data,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, avatar: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Changer son mot de passe
router.patch("/me/password", authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "Ancien et nouveau mot de passe requis" });
    if (newPassword.length < 6)
      return res.status(400).json({ error: "Minimum 6 caractères" });

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

// Déconnecter TOUS les utilisateurs (AVANT /:id pour éviter le conflit)
router.delete("/sessions/all", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    await prisma.activeSession.deleteMany({ where: { userId: { not: req.user!.id } } });
    res.json({ message: "Tous les utilisateurs déconnectés" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Routes avec :id (APRÈS les routes fixes) ─────────────────

// Activer / désactiver
router.patch("/:id/toggle", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: "Utilisateur non trouvé" });
    if (req.user!.role === "ADMIN" && target.role === "SUPER_ADMIN")
      return res.status(403).json({ error: "Accès refusé" });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data:  { isActive: !target.isActive },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Déconnecter un utilisateur spécifique
router.delete("/:id/session", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req, res) => {
  try {
    await prisma.activeSession.deleteMany({ where: { userId: req.params.id } });
    res.json({ message: "Utilisateur déconnecté" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprimer complètement un utilisateur
router.delete("/:id", authenticate, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res) => {
  try {
    if (req.params.id === req.user!.id)
      return res.status(400).json({ error: "Impossible de supprimer votre propre compte" });

    await prisma.activeSession.deleteMany({ where: { userId: req.params.id } });
    await prisma.loginHistory.deleteMany({ where: { userId: req.params.id } });
    await prisma.message.deleteMany({
      where: { OR: [{ senderId: req.params.id }, { receiverId: req.params.id }] },
    });
    await prisma.pushSubscription.deleteMany({ where: { userId: req.params.id } });
    await prisma.adminLaboratory.deleteMany({ where: { userId: req.params.id } });

    const delegate = await prisma.delegate.findUnique({ where: { userId: req.params.id } });
    if (delegate) {
      await prisma.delegateObjective.deleteMany({ where: { delegateId: delegate.id } });
      await prisma.weeklyPlanning.deleteMany({ where: { delegateId: delegate.id } });
      await prisma.gPSLog.deleteMany({ where: { delegateId: delegate.id } });
      await prisma.delegate.delete({ where: { userId: req.params.id } });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: "Utilisateur supprimé définitivement" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

// ── GET permissions d'un admin ───────────────────────────────
router.get("/:id/permissions", authenticate, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.params.id },
      select: { id: true, role: true, permissions: true } as any,
    });
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json({ permissions: (user as any).permissions || [] });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── SET permissions d'un admin (superadmin only) ─────────────
router.put("/:id/permissions", authenticate, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { permissions } = req.body as { permissions: string[] };
    if (!Array.isArray(permissions))
      return res.status(400).json({ error: "permissions doit être un tableau" });

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: "Utilisateur non trouvé" });
    if (target.role !== "ADMIN")
      return res.status(400).json({ error: "On ne peut définir des permissions que pour un ADMIN" });

    await prisma.user.update({
      where: { id: req.params.id },
      data:  { permissions } as any,
    });

    // Invalider la session de l'admin pour forcer le rechargement de ses permissions
    // (optionnel — les permissions sont relues à chaque requête)
    console.log(`🔒 Permissions mises à jour pour ${target.firstName} ${target.lastName}: ${permissions.join(", ")}`);

    res.json({ message: "Permissions mises à jour", permissions });
  } catch (err) {
    console.error("Set permissions error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;