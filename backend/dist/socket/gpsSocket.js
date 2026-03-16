"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGPSSocket = void 0;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const setupGPSSocket = (io) => {
    // Middleware JWT pour Socket.io
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token)
            return next(new Error("Token manquant"));
        try {
            const user = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.user = user;
            next();
        }
        catch {
            next(new Error("Token invalide"));
        }
    });
    io.on("connection", (socket) => {
        const user = socket.user;
        console.log(`📡 Socket connecté: ${user.role} [${user.id}]`);
        // ── Délégué envoie sa position ──────────────────────────
        socket.on("send_location", async (data) => {
            if (user.role !== "DELEGATE" || !user.delegateId)
                return;
            try {
                // Sauvegarder le log GPS en base MySQL
                await prisma.gPSLog.create({
                    data: {
                        delegateId: user.delegateId,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        status: data.status,
                    },
                });
                // Mettre à jour la dernière position du délégué
                const delegate = await prisma.delegate.update({
                    where: { id: user.delegateId },
                    data: {
                        status: data.status,
                        lastLat: data.latitude,
                        lastLng: data.longitude,
                        lastSeen: new Date(),
                    },
                    include: {
                        user: { select: { firstName: true, lastName: true } },
                    },
                });
                // Diffuser à tous les clients connectés (admins sur la carte)
                io.emit("delegate_location_update", {
                    delegateId: user.delegateId,
                    name: `${delegate.user.firstName} ${delegate.user.lastName}`,
                    zone: delegate.zone,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    status: data.status,
                    timestamp: new Date().toISOString(),
                });
            }
            catch (err) {
                console.error("GPS socket error:", err);
            }
        });
        // ── Délégué se déconnecte ───────────────────────────────
        socket.on("disconnect", async () => {
            if (user.role === "DELEGATE" && user.delegateId) {
                await prisma.delegate
                    .update({
                    where: { id: user.delegateId },
                    data: { status: "INACTIF" },
                })
                    .catch(() => { });
                io.emit("delegate_offline", {
                    delegateId: user.delegateId,
                    timestamp: new Date().toISOString(),
                });
                console.log(`📴 Délégué déconnecté: ${user.delegateId}`);
            }
        });
    });
};
exports.setupGPSSocket = setupGPSSocket;
