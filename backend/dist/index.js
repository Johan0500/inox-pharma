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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const delegates_1 = __importDefault(require("./routes/delegates"));
const reports_1 = __importDefault(require("./routes/reports"));
const gps_1 = __importDefault(require("./routes/gps"));
const grossistes_1 = __importDefault(require("./routes/grossistes"));
const laboratories_1 = __importDefault(require("./routes/laboratories"));
const pharmacies_1 = __importDefault(require("./routes/pharmacies"));
const products_1 = __importDefault(require("./routes/products"));
const planning_1 = __importDefault(require("./routes/planning"));
const stats_1 = __importDefault(require("./routes/stats"));
const sectors_1 = __importDefault(require("./routes/sectors"));
const salesReports_1 = __importDefault(require("./routes/salesReports"));
const messages_1 = __importDefault(require("./routes/messages"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const objectives_1 = __importDefault(require("./routes/objectives"));
const strategies_1 = __importDefault(require("./routes/strategies"));
const gpsSocket_1 = require("./socket/gpsSocket");
const alerts_1 = require("./utils/alerts");
const morningReport_1 = require("./utils/morningReport");
const emailSchedule_1 = __importDefault(require("./routes/emailSchedule"));
dotenv_1.default.config();
// ── App ──────────────────────────────────────────────────────
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// ── CORS ─────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,PATCH,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Lab");
    if (req.method === "OPTIONS")
        return res.status(200).json({});
    next();
});
app.use((0, cors_1.default)({ origin: "*", credentials: false }));
// ── Socket.io ────────────────────────────────────────────────
exports.io = new socket_io_1.Server(httpServer, {
    cors: { origin: "*", credentials: false },
});
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth", auth_1.default);
app.use("/api/users", users_1.default);
app.use("/api/delegates", delegates_1.default);
app.use("/api/reports", reports_1.default);
app.use("/api/gps", gps_1.default);
app.use("/api/grossistes", grossistes_1.default);
app.use("/api/laboratories", laboratories_1.default);
app.use("/api/pharmacies", pharmacies_1.default);
app.use("/api/products", products_1.default);
app.use("/api/planning", planning_1.default);
app.use("/api/stats", stats_1.default);
app.use("/api/sectors", sectors_1.default);
app.use("/api/sales-reports", salesReports_1.default);
app.use("/api/messages", messages_1.default);
app.use("/api/notifications", notifications_1.default);
app.use("/api/objectives", objectives_1.default);
app.use("/api/strategies", strategies_1.default);
app.use("/api/email-schedule", emailSchedule_1.default);
// ── Socket GPS + Messages ────────────────────────────────────
(0, gpsSocket_1.setupGPSSocket)(exports.io);
exports.io.use(async (socket, next) => {
    try {
        const jwt = await Promise.resolve().then(() => __importStar(require("jsonwebtoken")));
        const token = socket.handshake.auth.token;
        if (!token)
            return next(new Error("Token manquant"));
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.role = decoded.role;
        socket.delegateId = decoded.delegateId;
        next();
    }
    catch {
        next(new Error("Token invalide"));
    }
});
exports.io.on("connection", (socket) => {
    const userId = socket.userId;
    const role = socket.role;
    if (userId)
        socket.join(`user_${userId}`);
    if (role === "SUPER_ADMIN" || role === "ADMIN")
        socket.join("admins");
    socket.on("disconnect", () => {
        console.log(`🔌 Déconnecté: ${userId}`);
    });
});
// ── Health check ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "INOX PHARMA API running",
        db: "PostgreSQL (Supabase)",
        labs: ["lic-pharma", "croient"],
    });
});
// ── Démarrage serveur ────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "10000");
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ INOX PHARMA Server → http://localhost:${PORT}`);
    console.log(`   Base de données  → PostgreSQL (Supabase)`);
    console.log(`   Frontend attendu → ${process.env.FRONTEND_URL}`);
    console.log(`   Laboratoires     → lic-pharma | croient`);
    // Init DB en arrière-plan
    initDb();
    // Rapport automatique chaque matin à 9h30
    (0, morningReport_1.scheduleMorningReport)();
    // Vérifier les délégués inactifs toutes les 24h
    setInterval(() => { (0, alerts_1.checkInactiveDelegates)(); }, 24 * 60 * 60 * 1000);
    // Première vérification 10 secondes après démarrage
    setTimeout(() => { (0, alerts_1.checkInactiveDelegates)(); }, 10000);
});
// ── Init DB ──────────────────────────────────────────────────
async function initDb() {
    const prisma = new client_1.PrismaClient();
    try {
        const count = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
        if (count > 0) {
            console.log("ℹ️ Base déjà initialisée");
            return;
        }
        // ── 2 laboratoires seulement ─────────────────────────────
        for (const name of ["lic-pharma", "croient"]) {
            await prisma.laboratory.upsert({ where: { name }, update: {}, create: { name } });
        }
        console.log("✅ 2 laboratoires créés : lic-pharma + croient");
        // ── 4 grossistes ─────────────────────────────────────────
        for (const name of ["tedis", "copharmed", "laborex", "dpci"]) {
            await prisma.grossiste.upsert({ where: { name }, update: {}, create: { name } });
        }
        console.log("✅ 4 grossistes créés");
        // ── 26 produits ──────────────────────────────────────────
        const products = [
            { name: "CROCIP-TZ", group: "GROUPE 1", specialty: "CHIRURGIE" },
            { name: "ACICROF-P", group: "GROUPE 1", specialty: "CHIRURGIE" },
            { name: "PIRRO", group: "GROUPE 1", specialty: "CHIRURGIE" },
            { name: "ROLIK", group: "GROUPE 1", specialty: "CHIRURGIE" },
            { name: "FEROXYDE", group: "GROUPE 1", specialty: "CHIRURGIE" },
            { name: "HEAMOCARE", group: "GROUPE 1", specialty: "CHIRURGIE" },
            { name: "CYPRONURAN", group: "GROUPE 1", specialty: "CHIRURGIE" },
            { name: "AZIENT", group: "GROUPE 1", specialty: "NEPHROLOGIE" },
            { name: "CROZOLE", group: "GROUPE 1", specialty: "NEPHROLOGIE" },
            { name: "BETAMECRO", group: "GROUPE 2", specialty: "DERMATOLOGIE" },
            { name: "BECLOZOLE", group: "GROUPE 2", specialty: "DERMATOLOGIE" },
            { name: "KEOZOL", group: "GROUPE 2", specialty: "DERMATOLOGIE" },
            { name: "MRITIZ", group: "GROUPE 2", specialty: "DERMATOLOGIE" },
            { name: "GLIZAR MR", group: "GROUPE 2", specialty: "DIABETOLOGIE" },
            { name: "CROFORMIN", group: "GROUPE 2", specialty: "DIABETOLOGIE" },
            { name: "PREGIB", group: "GROUPE 2", specialty: "DIABETOLOGIE" },
            { name: "CEXIME", group: "GROUPE 3", specialty: "PEDIATRIE" },
            { name: "CROCILLINE", group: "GROUPE 3", specialty: "PEDIATRIE" },
            { name: "GUAMEN", group: "GROUPE 3", specialty: "PEDIATRIE" },
            { name: "TERCO", group: "GROUPE 3", specialty: "PEDIATRIE" },
            { name: "CROLINI GEL", group: "GROUPE 3", specialty: "KINESIE" },
            { name: "CETAFF", group: "GROUPE 3", specialty: "KINESIE" },
            { name: "COFEN", group: "GROUPE 3", specialty: "KINESIE" },
            { name: "DOLBUFEN", group: "GROUPE 3", specialty: "KINESIE" },
            { name: "ESOMECRO", group: "GROUPE 4", specialty: "RHUMATOLOGIE NEURO TRAUMATO" },
            { name: "CROGENTA", group: "GROUPE 4", specialty: "OPHTALMOLOGIE" },
        ];
        for (const p of products) {
            await prisma.product.upsert({ where: { name: p.name }, update: {}, create: p });
        }
        console.log("✅ 26 produits créés");
        // ── Super Admin ───────────────────────────────────────────
        const hash = await bcryptjs_1.default.hash("Admin@2025!", 12);
        await prisma.user.create({
            data: {
                email: "admin@inoxpharma.com",
                password: hash,
                firstName: "Super",
                lastName: "Admin",
                role: "SUPER_ADMIN",
            },
        });
        console.log("✅ Super Admin créé : admin@inoxpharma.com / Admin@2025!");
        console.log("🎉 Base initialisée avec succès !");
    }
    catch (e) {
        console.log("⚠️ Seed erreur:", e);
    }
    finally {
        await prisma.$disconnect();
    }
}
