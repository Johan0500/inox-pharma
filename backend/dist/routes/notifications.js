"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushToUser = sendPushToUser;
exports.sendPushToAdmins = sendPushToAdmins;
exports.notifyAdmins = notifyAdmins;
exports.sendPushToDelegates = sendPushToDelegates;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const web_push_1 = __importDefault(require("web-push"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ── Configuration VAPID ──────────────────────────────────────
web_push_1.default.setVapidDetails(`mailto:${process.env.VAPID_EMAIL}`, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
// ── Fonctions utilitaires exportées ─────────────────────────
async function sendPushToUser(userId, title, body, url = "/") {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.allSettled(subs.map(async (sub) => {
        try {
            await web_push_1.default.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body, icon: "/icon-192.png", badge: "/icon-192.png", url }));
        }
        catch (err) {
            if (err.statusCode === 410) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } });
            }
            else {
                console.error(`Push failed for subscription ${sub.id}:`, err);
            }
        }
    }));
}
async function sendPushToAdmins(title, body, url = "/") {
    const admins = await prisma.user.findMany({
        where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
        select: { id: true },
    });
    await Promise.allSettled(admins.map((admin) => sendPushToUser(admin.id, title, body, url)));
}
// ── Alias exporté pour salesReports.ts et alerts.ts ─────────
async function notifyAdmins(title, body, url = "/") {
    return sendPushToAdmins(title, body, url);
}
async function sendPushToDelegates(title, body, url = "/") {
    const delegates = await prisma.user.findMany({
        where: { role: "DELEGATE", isActive: true },
        select: { id: true },
    });
    await Promise.allSettled(delegates.map((d) => sendPushToUser(d.id, title, body, url)));
}
// ── Routes ───────────────────────────────────────────────────
router.post("/subscribe", auth_1.authenticate, async (req, res) => {
    try {
        const { endpoint, p256dh, auth } = req.body;
        if (!endpoint || !p256dh || !auth)
            return res.status(400).json({ error: "Données manquantes" });
        await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: { p256dh, auth, userId: req.user.id },
            create: { userId: req.user.id, endpoint, p256dh, auth },
        });
        res.json({ message: "Abonnement enregistré" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
router.delete("/unsubscribe", auth_1.authenticate, async (req, res) => {
    try {
        const { endpoint } = req.body;
        await prisma.pushSubscription.deleteMany({
            where: { userId: req.user.id, endpoint },
        });
        res.json({ message: "Désabonnement effectué" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
router.get("/vapid-key", (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});
router.post("/send", auth_1.authenticate, (0, auth_1.requireRole)("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const { userId, title, body, url } = req.body;
        if (!title || !body)
            return res.status(400).json({ error: "Titre et message requis" });
        if (userId) {
            await sendPushToUser(userId, title, body, url ?? "/");
        }
        else {
            await sendPushToAdmins(title, body, url ?? "/");
        }
        res.json({ message: "Notification envoyée" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
