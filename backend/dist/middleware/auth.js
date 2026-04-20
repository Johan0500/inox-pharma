"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer "))
            return res.status(401).json({ error: "Token manquant" });
        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        }
        catch (jwtErr) {
            return res.status(401).json({ error: "Token invalide ou expiré" });
        }
        // Vérifier session active
        const session = await prisma.activeSession.findUnique({
            where: { userId: decoded.id },
        });
        if (!session || session.token !== token) {
            return res.status(401).json({
                error: "Session terminée. Veuillez vous reconnecter.",
                code: "SESSION_INVALID",
            });
        }
        // Mettre à jour lastActive
        await prisma.activeSession.update({
            where: { userId: decoded.id },
            data: { lastActive: new Date() },
        });
        req.user = {
            id: decoded.id,
            role: decoded.role,
            labs: decoded.labs,
            delegateId: decoded.delegateId,
        };
        next();
    }
    catch (err) {
        console.error("Auth error:", err);
        return res.status(401).json({ error: "Erreur d'authentification" });
    }
};
exports.authenticate = authenticate;
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role))
            return res.status(403).json({ error: "Accès refusé" });
        next();
    };
};
exports.requireRole = requireRole;
