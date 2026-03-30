import { Router }       from "express";
import { PrismaClient } from "@prisma/client";
import webpush          from "web-push";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Initialiser VAPID
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// ── Enregistrer abonnement push ──────────────────────────────
router.post("/subscribe", authenticate, async (req: AuthRequest, res) => {
  try {
    const { endpoint, p256dh, auth } = req.body;
    if (!endpoint || !p256dh || !auth)
      return res.status(400).json({ error: "Données manquantes" });

    await prisma.pushSubscription.upsert({
      where:  { endpoint },
      update: { p256dh, auth, userId: req.user!.id },
      create: { userId: req.user!.id, endpoint, p256dh, auth },
    });
    res.json({ message: "Abonnement enregistré" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Se désabonner ────────────────────────────────────────────
router.delete("/unsubscribe", authenticate, async (req: AuthRequest, res) => {
  try {
    const { endpoint } = req.body;
    await prisma.pushSubscription.deleteMany({
      where: { userId: req.user!.id, endpoint },
    });
    res.json({ message: "Désabonnement effectué" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Clé publique VAPID pour le frontend ─────────────────────
router.get("/vapid-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// ── Envoyer notification manuelle (admin) ────────────────────
router.post("/send", authenticate, requireRole("SUPER_ADMIN","ADMIN"), async (req: AuthRequest, res) => {
  try {
    const { userId, title, body, url } = req.body;
    if (!title || !body)
      return res.status(400).json({ error: "Titre et message requis" });

    if (userId) {
      await sendPushToUser(userId, title, body, url || "/");
    } else {
      await sendPushToAdmins(title, body, url || "/");
    }
    res.json({ message: "Notification envoyée" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Fonctions utilitaires exportées ─────────────────────────
export async function sendPushToUser(
  userId: string,
  title:  string,
  body:   string,
  url:    string = "/"
) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, icon: "/icon-192.png", badge: "/icon-192.png", url })
      );
    } catch (err: any) {
      if (err.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      }
    }
  }
}

export async function sendPushToAdmins(title: string, body: string, url: string = "/") {
  const admins = await prisma.user.findMany({
    where:   { role: { in: ["SUPER_ADMIN","ADMIN"] }, isActive: true },
    include: { pushSubscriptions: true },
  });
  for (const admin of admins) {
    await sendPushToUser(admin.id, title, body, url);
  }
}

export async function sendPushToDelegates(title: string, body: string, url: string = "/") {
  const delegates = await prisma.user.findMany({
    where:   { role: "DELEGATE", isActive: true },
    include: { pushSubscriptions: true },
  });
  for (const d of delegates) {
    await sendPushToUser(d.id, title, body, url);
  }
}

export default router;