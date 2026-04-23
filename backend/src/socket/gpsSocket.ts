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

  io.on("connection", async (socket: Socket) => {
    const userId     = (socket as any).userId;
    const role       = (socket as any).role;
    const delegateId = (socket as any).delegateId;

    console.log(`🔌 Connecté: ${userId} (${role})`);

    // ── Admin/SuperAdmin : rejoindre la salle + recevoir l'état actuel ──
    if (role === "SUPER_ADMIN" || role === "ADMIN") {
      socket.join("admins");
      console.log(`👑 Admin ${userId} rejoint la salle admins`);

      // Filtre labo pour ADMIN (pas de restriction pour SUPER_ADMIN)
      let labFilter: any = {};
      if (role === "ADMIN") {
        const adminLabs = await prisma.adminLaboratory.findMany({
          where:  { userId },
          select: { laboratoryId: true },
        });
        labFilter = { laboratoryId: { in: adminLabs.map((l: any) => l.laboratoryId) } };
      }

      // 1. Envoyer toutes les positions actuelles
      const delegates = await prisma.delegate.findMany({
        where:   labFilter,
        include: {
          user:       { select: { firstName: true, lastName: true } },
          laboratory: { select: { name: true } },
        },
      });

      delegates.forEach((d: any) => {
        if (d.lastLat && d.lastLng) {
          socket.emit("delegate_location_update", {
            delegateId: d.id,
            name:       `${d.user.firstName} ${d.user.lastName}`,
            zone:       d.zone,
            status:     d.status,
            laboratory: d.laboratory.name,
            latitude:   d.lastLat,
            longitude:  d.lastLng,
            timestamp:  d.lastSeen?.toISOString() || new Date().toISOString(),
          });
        }
      });

      // 2. Envoyer les check-ins du jour
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const checkInWhere: any = { timestamp: { gte: todayStart } };
      if (labFilter.laboratoryId) {
        checkInWhere.delegate = { laboratoryId: labFilter.laboratoryId };
      }

      const todayCheckIns = await prisma.checkIn.findMany({
        where:   checkInWhere,
        include: {
          delegate: {
            include: {
              user:       { select: { firstName: true, lastName: true } },
              laboratory: { select: { name: true } },
            },
          },
        },
        orderBy: { timestamp: "desc" },
        take:    50,
      });

      todayCheckIns.forEach((ci: any) => {
        socket.emit("delegate_check_in", {
          delegateId: ci.delegateId,
          name:       `${ci.delegate.user.firstName} ${ci.delegate.user.lastName}`,
          laboratory: ci.delegate.laboratory?.name || "",
          latitude:   ci.latitude,
          longitude:  ci.longitude,
          placeName:  ci.placeName,
          timestamp:  ci.timestamp.toISOString(),
        });
      });

      console.log(`📦 Admin ${userId} : ${delegates.length} positions + ${todayCheckIns.length} check-ins envoyés`);
    }

    // ── Délégué : rejoindre sa salle ──
    if (delegateId) {
      socket.join(`delegate_${delegateId}`);
    }

    // ── Position GPS temps réel ──────────────────────────────
    socket.on("send_location", async (data: {
      latitude:  number;
      longitude: number;
      status:    string;
    }) => {
      try {
        if (!delegateId) return;
        const { latitude, longitude, status } = data;

        if (!isValidCoord(latitude, longitude)) {
          console.warn(`⚠️ Coordonnées invalides de ${delegateId}: ${latitude}, ${longitude}`);
          return;
        }

        await prisma.delegate.update({
          where: { id: delegateId },
          data:  { lastLat: latitude, lastLng: longitude, status: status as any, lastSeen: new Date() },
        });

        await prisma.gPSLog.create({
          data: { delegateId, latitude, longitude, status: status as any },
        });

        const delegate = await prisma.delegate.findUnique({
          where:   { id: delegateId },
          include: {
            user:       { select: { firstName: true, lastName: true } },
            laboratory: { select: { name: true } },
          },
        });

        io.to("admins").emit("delegate_location_update", {
          delegateId,
          name:       `${delegate?.user.firstName} ${delegate?.user.lastName}`,
          zone:       delegate?.zone,
          laboratory: (delegate as any)?.laboratory?.name || "",
          status,
          latitude,
          longitude,
          timestamp:  new Date().toISOString(),
        });
      } catch (err) {
        console.error("Erreur GPS:", err);
      }
    });

    // ── Flush positions accumulées hors ligne ────────────────
    socket.on("flush_offline_gps", async (points: Array<{
      latitude:  number;
      longitude: number;
      status:    string;
      timestamp: string;
    }>) => {
      try {
        if (!delegateId || !Array.isArray(points) || points.length === 0) return;
        const valid = points.filter(p => isValidCoord(p.latitude, p.longitude));
        console.log(`📦 Flush offline GPS ${delegateId}: ${valid.length}/${points.length} pts`);

        await prisma.gPSLog.createMany({
          data: valid.map(p => ({
            delegateId,
            latitude:  p.latitude,
            longitude: p.longitude,
            status:    p.status as any,
            timestamp: new Date(p.timestamp),
          })),
          skipDuplicates: true,
        });

        const last = valid[valid.length - 1];
        await prisma.delegate.update({
          where: { id: delegateId },
          data:  { lastLat: last.latitude, lastLng: last.longitude, lastSeen: new Date(last.timestamp) },
        });

        socket.emit("flush_offline_gps_ack", { count: valid.length });
      } catch (err) {
        console.error("Erreur flush offline GPS:", err);
      }
    });

    // ── Pointage manuel ─────────────────────────────────────
    socket.on("check_in", async (data: {
      latitude:  number;
      longitude: number;
      placeName: string;
      timestamp: string;
    }) => {
      try {
        if (!delegateId) return;
        if (!isValidCoord(data.latitude, data.longitude)) return;

        const delegate = await prisma.delegate.findUnique({
          where:   { id: delegateId },
          include: {
            user:       { select: { firstName: true, lastName: true } },
            laboratory: { select: { name: true } },
          },
        });
        if (!delegate) return;

        // ✅ Sauvegarde persistante en base
        const saved = await prisma.checkIn.create({
          data: {
            delegateId,
            latitude:  data.latitude,
            longitude: data.longitude,
            placeName: data.placeName.trim(),
            timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          },
        });

        const name       = `${delegate.user.firstName} ${delegate.user.lastName}`;
        const laboratory = (delegate as any).laboratory?.name || "";

        io.to("admins").emit("delegate_check_in", {
          delegateId,
          name,
          laboratory,
          latitude:  saved.latitude,
          longitude: saved.longitude,
          placeName: saved.placeName,
          timestamp: saved.timestamp.toISOString(),
        });

        socket.emit("check_in_ack", { success: true, id: saved.id });
        console.log(`📍 Check-in ${name} (${laboratory}) : ${saved.placeName}`);
      } catch (err) {
        console.error("Erreur check_in:", err);
        socket.emit("check_in_ack", { success: false });
      }
    });

    // ── Déconnexion ─────────────────────────────────────────
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

function isValidCoord(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" && typeof lng === "number" &&
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90  && lat <= 90  &&
    lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}