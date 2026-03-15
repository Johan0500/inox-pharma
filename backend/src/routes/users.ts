import { Router } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// ── CRÉER UN UTILISATEUR ──────────────────────────────────────
// Seul l'Admin ou Super Admin peut créer des accès
router.post("/", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { email, password, firstName, lastName, role, labs, zone, phone, sectorId } = req.body;

    if (!email || !password || !firstName || !lastName || !role)
      return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis" });

    // Un Admin ne peut créer que des Délégués pour ses propres labos
    if (req.user!.role === "ADMIN") {
      if (role !== "DELEGATE")
        return res.status(403).json({ error: "Un Admin peut seulement créer des Délégués" });
      if (!labs || !labs[0] || !req.user!.labs?.includes(labs[0]))
        return res.status(403).json({ error: "Vous n'avez pas accès à ce laboratoire" });
    }

    // Vérifier que l'email n'existe pas
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return res.status(400).json({ error: "Cet email est déjà utilisé" });

    const hashedPwd = await bcrypt.hash(password, 12);

    // Trouver le laboratoire
    let labRecord = null;
    if (labs && labs[0]) {
      labRecord = await prisma.laboratory.findUnique({ where: { name: labs[0] } });
      if (!labRecord)
        return res.status(400).json({ error: `Laboratoire "${labs[0]}" non trouvé` });
    }

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPwd,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        createdById: req.user!.id,
        ...(role === "ADMIN" && labs?.length && {
          adminLabs: {
            create: await Promise.all(
              labs.map(async (labName: string) => {
                const lab = await prisma.laboratory.findUnique({ where: { name: labName } });
                if (!lab) throw new Error(`Laboratoire "${labName}" non trouvé`);
                return { laboratoryId: lab.id };
              })
            ),
          },
        }),
        ...(role === "DELEGATE" && labRecord && {
          delegate: {
            create: {
              laboratoryId: labRecord.id,
              zone: zone?.trim() || "",
              phone: phone?.trim() || null,
              sectorId: sectorId || null,
            },
          },
        }),
      },
      include: {
        adminLabs: { include: { laboratory: true } },
        delegate: { include: { laboratory: true, sector: true } },
      },
    });

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: { ...user, password: undefined },
    });
  } catch (err: any) {
    console.error("Create user error:", err);
    res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// ── LISTER LES UTILISATEURS ───────────────────────────────────
router.get("/", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const where: any = {};

    // Admin filtre selon ses labos
    if (req.user!.role === "ADMIN") {
      const labIds = await prisma.laboratory.findMany({
        where: { name: { in: req.user!.labs || [] } },
        select: { id: true },
      });
      where.OR = [
        { delegate: { laboratoryId: { in: labIds.map((l) => l.id) } } },
        { adminLabs: { some: { laboratoryId: { in: labIds.map((l) => l.id) } } } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        adminLabs: { include: { laboratory: true } },
        delegate: { include: { laboratory: true, sector: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(users.map((u) => ({ ...u, password: undefined })));
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── ACTIVER / DÉSACTIVER ──────────────────────────────────────
router.patch("/:id/toggle", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
    });
    res.json({
      isActive: updated.isActive,
      message: updated.isActive ? "Compte activé" : "Compte désactivé",
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── MODIFIER ──────────────────────────────────────────────────
router.patch("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), async (req, res) => {
  try {
    const { firstName, lastName, phone, zone } = req.body;
    await prisma.user.update({
      where: { id: req.params.id },
      data: { firstName, lastName },
    });
    if (zone !== undefined) {
      await prisma.delegate.updateMany({
        where: { userId: req.params.id },
        data: { zone, phone },
      });
    }
    res.json({ message: "Utilisateur mis à jour" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
