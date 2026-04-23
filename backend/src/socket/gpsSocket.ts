import { Server, Socket } from "socket.io";
import { PrismaClient }   from "@prisma/client";
import jwt                from "jsonwebtoken";

const prisma = new PrismaClient();

export function setupGPSSocket(io: Server) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Token manquant"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      (socket as any).userId     = decoded.id;
      (socket as any).role       = decoded.role;
      (socket as any).delegateId = decoded.delegateId;
      next();
    } catch {
      next(new Error("Token invalide"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId     = (socket as any).userId;
    const role       = (socket as any).role;
    const delegateId = (socket as any).delegateId;

    console.log(`🔌 Connecté: ${userId} (${role})`);

    // Rejoindre la salle admin
    if (role === "SUPER_ADMIN" || role === "ADMIN") {
      socket.join("admins");
      console.log(`👑 Admin rejoint la salle admins`);
    }

    // Rejoindre la salle du délégué
    if (delegateId) {
      socket.join(`delegate_${delegateId}`);
    }

    socket.on("send_location", async (data: {
      latitude:  number;
      longitude: number;
      status:    string;
    }) => {
      try {
        if (!delegateId) return;

        const { latitude, longitude, status } = data;

        // Mettre à jour la position du délégué en base
        await prisma.delegate.update({
          where: { id: delegateId },
          data: {
            lastLat:  latitude,
            lastLng:  longitude,
            status:   status as any,
            lastSeen: new Date(),
          },
        });

        // Enregistrer dans l'historique GPS
        await prisma.gPSLog.create({
          data: {
            delegateId,
            latitude,
            longitude,
            status: status as any,
          },
        });

        // Récupérer les infos du délégué
        const delegate = await prisma.delegate.findUnique({
          where: { id: delegateId },
          include: { user: { select: { firstName: true, lastName: true } } },
        });

        // Envoyer la position à TOUS les admins connectés
        io.to("admins").emit("delegate_location_update", {
          delegateId,
          name:      `${delegate?.user.firstName} ${delegate?.user.lastName}`,
          zone:      delegate?.zone,
          status,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        });

        console.log(`📍 Position reçue de ${delegateId}: ${latitude}, ${longitude}`);
      } catch (err) {
        console.error("Erreur GPS:", err);
      }
    });

    // ── Pointage manuel du délégué ──────────────────────────────
    socket.on("check_in", async (data: {
      latitude:     number;
      longitude:    number;
      placeName:    string;
      delegateName: string;
      timestamp:    string;
    }) => {
      try {
        if (!delegateId) return;

        const { latitude, longitude, placeName, timestamp } = data;

        // Récupérer les infos complètes du délégué (nom + labo)
        const delegate = await prisma.delegate.findUnique({
          where:   { id: delegateId },
          include: {
            user:       { select: { firstName: true, lastName: true } },
            laboratory: { select: { name: true } },
          },
        });

        if (!delegate) return;

        const name       = `${delegate.user.firstName} ${delegate.user.lastName}`;
        const laboratory = delegate.laboratory?.name || "";

        // Diffuser le check-in à tous les admins connectés
        io.to("admins").emit("delegate_check_in", {
          delegateId,
          name,
          laboratory,
          latitude,
          longitude,
          placeName,
          timestamp: timestamp || new Date().toISOString(),
        });

        console.log(`📍 Check-in de ${name} (${laboratory}) : ${placeName}`);
      } catch (err) {
        console.error("Erreur check_in:", err);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`🔌 Déconnecté: ${userId}`);
      if (delegateId) {
        try {
          await prisma.delegate.update({
            where: { id: delegateId },
            data:  { status: "INACTIF" },
          });
          io.to("admins").emit("delegate_offline", { delegateId });
        } catch {}
      }
    });
  });
}