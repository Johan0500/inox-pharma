"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const notifications_1 = require("./notifications");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ── Envoyer un message ───────────────────────────────────────
router.post("/", auth_1.authenticate, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        if (!receiverId || !content?.trim())
            return res.status(400).json({ error: "Destinataire et contenu requis" });
        const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
        if (!receiver)
            return res.status(404).json({ error: "Destinataire non trouvé" });
        const message = await prisma.message.create({
            data: {
                senderId: req.user.id,
                receiverId,
                content: content.trim(),
            },
            include: {
                sender: { select: { firstName: true, lastName: true, role: true } },
                receiver: { select: { firstName: true, lastName: true } },
            },
        });
        // Notification Socket.io temps réel
        try {
            const { io } = await Promise.resolve().then(() => __importStar(require("../index")));
            io.to(`user_${receiverId}`).emit("new_message", message);
        }
        catch { }
        // Notification push
        try {
            await (0, notifications_1.sendPushToUser)(receiverId, `💬 Message de ${message.sender.firstName} ${message.sender.lastName}`, content.length > 60 ? content.slice(0, 60) + "..." : content, "/");
        }
        catch { }
        res.status(201).json(message);
    }
    catch (err) {
        console.error("Message error:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Messages reçus ───────────────────────────────────────────
router.get("/inbox", auth_1.authenticate, async (req, res) => {
    try {
        const messages = await prisma.message.findMany({
            where: { receiverId: req.user.id },
            include: { sender: { select: { firstName: true, lastName: true, role: true } } },
            orderBy: { createdAt: "desc" },
        });
        res.json(messages);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Messages envoyés ─────────────────────────────────────────
router.get("/sent", auth_1.authenticate, async (req, res) => {
    try {
        const messages = await prisma.message.findMany({
            where: { senderId: req.user.id },
            include: { receiver: { select: { firstName: true, lastName: true, role: true } } },
            orderBy: { createdAt: "desc" },
        });
        res.json(messages);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Conversation entre 2 utilisateurs ───────────────────────
router.get("/conversation/:userId", auth_1.authenticate, async (req, res) => {
    try {
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: req.user.id, receiverId: req.params.userId },
                    { senderId: req.params.userId, receiverId: req.user.id },
                ],
            },
            include: {
                sender: { select: { firstName: true, lastName: true } },
                receiver: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "asc" },
        });
        // Marquer comme lus
        await prisma.message.updateMany({
            where: {
                senderId: req.params.userId,
                receiverId: req.user.id,
                isRead: false,
            },
            data: { isRead: true },
        });
        res.json(messages);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Nombre de messages non lus ───────────────────────────────
router.get("/unread/count", auth_1.authenticate, async (req, res) => {
    try {
        const count = await prisma.message.count({
            where: { receiverId: req.user.id, isRead: false },
        });
        res.json({ count });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Liste des contacts avec dernier message ──────────────────
router.get("/contacts", auth_1.authenticate, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { id: { not: req.user.id }, isActive: true },
            select: { id: true, firstName: true, lastName: true, role: true },
            orderBy: { firstName: "asc" },
        });
        const contacts = await Promise.all(users.map(async (u) => {
            const [lastMsg, unread] = await Promise.all([
                prisma.message.findFirst({
                    where: {
                        OR: [
                            { senderId: req.user.id, receiverId: u.id },
                            { senderId: u.id, receiverId: req.user.id },
                        ],
                    },
                    orderBy: { createdAt: "desc" },
                }),
                prisma.message.count({
                    where: { senderId: u.id, receiverId: req.user.id, isRead: false },
                }),
            ]);
            return { ...u, lastMessage: lastMsg, unread };
        }));
        // Trier par dernier message
        contacts.sort((a, b) => {
            if (!a.lastMessage && !b.lastMessage)
                return 0;
            if (!a.lastMessage)
                return 1;
            if (!b.lastMessage)
                return -1;
            return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
        });
        res.json(contacts);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// ── Supprimer un message ─────────────────────────────────────
router.delete("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const message = await prisma.message.findUnique({ where: { id: req.params.id } });
        if (!message)
            return res.status(404).json({ error: "Message non trouvé" });
        if (message.senderId !== req.user.id)
            return res.status(403).json({ error: "Accès refusé" });
        await prisma.message.delete({ where: { id: req.params.id } });
        res.json({ message: "Message supprimé" });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
