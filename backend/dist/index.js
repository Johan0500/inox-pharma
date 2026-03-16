"use strict";
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
const child_process_1 = require("child_process");
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
const gpsSocket_1 = require("./socket/gpsSocket");
dotenv_1.default.config();
// ── Init DB ──────────────────────────────────────────────────
const initDb = async () => {
    try {
        const cmd = process.platform === "win32"
            ? "node_modules\\.bin\\prisma.cmd migrate deploy"
            : "node_modules/.bin/prisma migrate deploy";
        (0, child_process_1.execSync)(cmd, { stdio: "inherit" });
        console.log("✅ Migrations appliquées");
    }
    catch (e) {
        console.log("⚠️ Migration ignorée");
    }
    const prisma = new client_1.PrismaClient();
    try {
        const count = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
        if (count > 0) {
            console.log("ℹ️ Base déjà initialisée");
            return;
        }
        for (const name of ["lic-pharma", "medisure", "sigma", "ephaco", "stallion"]) {
            await prisma.laboratory.upsert({ where: { name }, update: {}, create: { name } });
        }
        for (const name of ["tedis", "copharmed", "laborex", "dpci"]) {
            await prisma.grossiste.upsert({ where: { name }, update: {}, create: { name } });
        }
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
        const hash = await bcryptjs_1.default.hash("Admin@2025!", 12);
        await prisma.user.create({
            data: {
                email: "admin@inoxpharma.com",
                password: hash,
                firstName: "Super",
                lastName: "Admin",
                role: "SUPER_ADMIN",
            }
        });
        console.log("✅ Base initialisée — admin@inoxpharma.com / Admin@2025!");
    }
    catch (e) {
        console.log("⚠️ Seed erreur:", e);
    }
    finally {
        await prisma.$disconnect();
    }
};
initDb();
// ── Serveur ──────────────────────────────────────────────────
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// CORS — accepte tout
app.use((0, cors_1.default)({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
}));
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: (origin, callback) => callback(null, true),
        credentials: true,
    },
});
exports.io = io;
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
(0, gpsSocket_1.setupGPSSocket)(io);
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "INOX PHARMA API running",
        db: "PostgreSQL (Supabase)",
    });
});
const PORT = parseInt(process.env.PORT || "10000");
// Démarrer le serveur IMMÉDIATEMENT
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ INOX PHARMA Server → http://localhost:${PORT}`);
    console.log(`   Base de données  → PostgreSQL (Supabase)`);
    console.log(`   Frontend attendu → ${process.env.FRONTEND_URL}`);
});
// Migrations et seed en arrière-plan (sans bloquer le serveur)
setTimeout(() => {
    initDb().then(() => {
        console.log("✅ Base de données prête");
    }).catch((e) => {
        console.log("⚠️ Erreur DB:", e);
    });
}, 2000);
