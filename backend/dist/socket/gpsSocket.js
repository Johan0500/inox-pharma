"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGPSSocket = setupGPSSocket;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
function setupGPSSocket(io) {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token)
                return next(new Error("Token manquant"));
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.role = decoded.role;
            socket.delegateId = decoded.delegateId;
            next();
        }
        catch {
            next(new Error("Token invalide"));
        }
    });
    io.on("connection", (socket) => {
        const userId = socket.userId;
        const role = socket.role;
        const delegateId = socket.delegateId;
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
        socket.on("send_location", async (data) => {
            try {
                if (!delegateId)
                    return;
                const { latitude, longitude, status } = data;
                // Mettre à jour la position du délégué en base
                await prisma.delegate.update({
                    where: { id: delegateId },
                    data: {
                        lastLat: latitude,
                        lastLng: longitude,
                        status: status,
                        lastSeen: new Date(),
                    },
                });
                // Enregistrer dans l'historique GPS
                await prisma.gPSLog.create({
                    data: {
                        delegateId,
                        latitude,
                        longitude,
                        status: status,
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
                    name: `${delegate?.user.firstName} ${delegate?.user.lastName}`,
                    zone: delegate?.zone,
                    status,
                    latitude,
                    longitude,
                    timestamp: new Date().toISOString(),
                });
                console.log(`📍 Position reçue de ${delegateId}: ${latitude}, ${longitude}`);
            }
            catch (err) {
                console.error("Erreur GPS:", err);
            }
        });
        socket.on("disconnect", async () => {
            console.log(`🔌 Déconnecté: ${userId}`);
            if (delegateId) {
                try {
                    await prisma.delegate.update({
                        where: { id: delegateId },
                        data: { status: "INACTIF" },
                    });
                    io.to("admins").emit("delegate_offline", { delegateId });
                }
                catch { }
            }
        });
    });
}
