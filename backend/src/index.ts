import express         from "express";
import cors            from "cors";
import { createServer } from "http";
import { Server }      from "socket.io";
import dotenv          from "dotenv";
import { execSync }    from "child_process";
import { PrismaClient } from "@prisma/client";
import bcrypt          from "bcryptjs";

import authRoutes      from "./routes/auth";
import userRoutes      from "./routes/users";
import delegateRoutes  from "./routes/delegates";
import reportRoutes    from "./routes/reports";
import gpsRoutes       from "./routes/gps";
import grossisteRoutes from "./routes/grossistes";
import labRoutes       from "./routes/laboratories";
import pharmacyRoutes  from "./routes/pharmacies";
import productRoutes   from "./routes/products";
import planningRoutes  from "./routes/planning";
import statsRoutes     from "./routes/stats";
import sectorRoutes    from "./routes/sectors";
import { setupGPSSocket } from "./socket/gpsSocket";

dotenv.config();

// ── Init DB ──────────────────────────────────────────────────
const initDb = async () => {
  try {
    const cmd = process.platform === "win32"
      ? "node_modules\\.bin\\prisma.cmd migrate deploy"
      : "node_modules/.bin/prisma migrate deploy";
    execSync(cmd, { stdio: "inherit" });
    console.log("✅ Migrations appliquées");
  } catch (e) {
    console.log("⚠️ Migration ignorée");
  }

  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
    if (count > 0) {
      console.log("ℹ️ Base déjà initialisée");
      return;
    }

    for (const name of ["lic-pharma","medisure","sigma","ephaco","stallion"]) {
      await prisma.laboratory.upsert({ where:{name}, update:{}, create:{name} });
    }
    for (const name of ["tedis","copharmed","laborex","dpci"]) {
      await prisma.grossiste.upsert({ where:{name}, update:{}, create:{name} });
    }

    const products = [
      { name:"CROCIP-TZ",   group:"GROUPE 1", specialty:"CHIRURGIE" },
      { name:"ACICROF-P",   group:"GROUPE 1", specialty:"CHIRURGIE" },
      { name:"PIRRO",       group:"GROUPE 1", specialty:"CHIRURGIE" },
      { name:"ROLIK",       group:"GROUPE 1", specialty:"CHIRURGIE" },
      { name:"FEROXYDE",    group:"GROUPE 1", specialty:"CHIRURGIE" },
      { name:"HEAMOCARE",   group:"GROUPE 1", specialty:"CHIRURGIE" },
      { name:"CYPRONURAN",  group:"GROUPE 1", specialty:"CHIRURGIE" },
      { name:"AZIENT",      group:"GROUPE 1", specialty:"NEPHROLOGIE" },
      { name:"CROZOLE",     group:"GROUPE 1", specialty:"NEPHROLOGIE" },
      { name:"BETAMECRO",   group:"GROUPE 2", specialty:"DERMATOLOGIE" },
      { name:"BECLOZOLE",   group:"GROUPE 2", specialty:"DERMATOLOGIE" },
      { name:"KEOZOL",      group:"GROUPE 2", specialty:"DERMATOLOGIE" },
      { name:"MRITIZ",      group:"GROUPE 2", specialty:"DERMATOLOGIE" },
      { name:"GLIZAR MR",   group:"GROUPE 2", specialty:"DIABETOLOGIE" },
      { name:"CROFORMIN",   group:"GROUPE 2", specialty:"DIABETOLOGIE" },
      { name:"PREGIB",      group:"GROUPE 2", specialty:"DIABETOLOGIE" },
      { name:"CEXIME",      group:"GROUPE 3", specialty:"PEDIATRIE" },
      { name:"CROCILLINE",  group:"GROUPE 3", specialty:"PEDIATRIE" },
      { name:"GUAMEN",      group:"GROUPE 3", specialty:"PEDIATRIE" },
      { name:"TERCO",       group:"GROUPE 3", specialty:"PEDIATRIE" },
      { name:"CROLINI GEL", group:"GROUPE 3", specialty:"KINESIE" },
      { name:"CETAFF",      group:"GROUPE 3", specialty:"KINESIE" },
      { name:"COFEN",       group:"GROUPE 3", specialty:"KINESIE" },
      { name:"DOLBUFEN",    group:"GROUPE 3", specialty:"KINESIE" },
      { name:"ESOMECRO",    group:"GROUPE 4", specialty:"RHUMATOLOGIE NEURO TRAUMATO" },
      { name:"CROGENTA",    group:"GROUPE 4", specialty:"OPHTALMOLOGIE" },
    ];
    for (const p of products) {
      await prisma.product.upsert({ where:{name:p.name}, update:{}, create:p });
    }

    const hash = await bcrypt.hash("Admin@2025!", 12);
    await prisma.user.create({
      data: {
        email:     "admin@inoxpharma.com",
        password:  hash,
        firstName: "Super",
        lastName:  "Admin",
        role:      "SUPER_ADMIN",
      }
    });
    console.log("✅ Base initialisée — admin@inoxpharma.com / Admin@2025!");
  } catch(e) {
    console.log("⚠️ Seed erreur:", e);
  } finally {
    await prisma.$disconnect();
  }
};

initDb();

// ── Serveur ──────────────────────────────────────────────────
const app        = express();
const httpServer = createServer(app);

// CORS — accepte tout
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/delegates",     delegateRoutes);
app.use("/api/reports",       reportRoutes);
app.use("/api/gps",           gpsRoutes);
app.use("/api/grossistes",    grossisteRoutes);
app.use("/api/laboratories",  labRoutes);
app.use("/api/pharmacies",    pharmacyRoutes);
app.use("/api/products",      productRoutes);
app.use("/api/planning",      planningRoutes);
app.use("/api/stats",         statsRoutes);
app.use("/api/sectors",       sectorRoutes);

setupGPSSocket(io);

app.get("/api/health", (req, res) => {
  res.json({
    status:  "ok",
    message: "INOX PHARMA API running",
    db:      "PostgreSQL (Supabase)",
  });
});

const PORT = parseInt(process.env.PORT || "10000");
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ INOX PHARMA Server → http://localhost:${PORT}`);
  console.log(`   Base de données  → PostgreSQL (Supabase)`);
  console.log(`   Frontend attendu → ${process.env.FRONTEND_URL}`);
});

export { io };
