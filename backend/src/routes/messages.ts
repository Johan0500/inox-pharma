import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";
import { io }           from "../index";

const router = Router();
const prisma = new PrismaClient();

// Envoyer un message
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content?.trim())
      return res.status(400).json({ error: "Destinataire et contenu requis" });

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return res.status(404).json({ error: "Destinataire non trouvé" });

    const message = await prisma.message.create({
      data: {
        senderId:   req.user!.id,
        receiverId,
        content:    content.trim(),
      },
      include: {
        sender:   { select: { firstName: true, lastName: true, role: true } },
        receiver: { select: { firstName: true, lastName: true } },
      },
    });

    // Notifier en temps réel via Socket.io
    io.to(`user_${receiverId}`).emit("new_message", message);

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Lire mes messages reçus
router.get("/inbox", authenticate, async (req: AuthRequest, res) => {
  try {
    const messages = await prisma.message.findMany({
      where:   { receiverId: req.user!.id },
      include: { sender: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Messages envoyés
router.get("/sent", authenticate, async (req: AuthRequest, res) => {
  try {
    const messages = await prisma.message.findMany({
      where:   { senderId: req.user!.id },
      include: { receiver: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Conversation entre deux utilisateurs
router.get("/conversation/:userId", authenticate, async (req: AuthRequest, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user!.id,       receiverId: req.params.userId },
          { senderId: req.params.userId,   receiverId: req.user!.id     },
        ],
      },
      include: {
        sender:   { select: { firstName: true, lastName: true } },
        receiver: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Marquer comme lus
    await prisma.message.updateMany({
      where:  { senderId: req.params.userId, receiverId: req.user!.id, isRead: false },
      data:   { isRead: true },
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Nombre de messages non lus
router.get("/unread/count", authenticate, async (req: AuthRequest, res) => {
  try {
    const count = await prisma.message.count({
      where: { receiverId: req.user!.id, isRead: false },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Liste des contacts avec dernier message
router.get("/contacts", authenticate, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      where:   { id: { not: req.user!.id }, isActive: true },
      select:  { id: true, firstName: true, lastName: true, role: true },
      orderBy: { firstName: "asc" },
    });

    const contacts = await Promise.all(users.map(async (u) => {
      const lastMsg = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: req.user!.id, receiverId: u.id },
            { senderId: u.id,         receiverId: req.user!.id },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
      const unread = await prisma.message.count({
        where: { senderId: u.id, receiverId: req.user!.id, isRead: false },
      });
      return { ...u, lastMessage: lastMsg, unread };
    }));

    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
