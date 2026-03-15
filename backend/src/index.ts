import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

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
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const initDb = async () => {
  // 1. Migration d'abord
  try {
    execSync("node_modules/.bin/prisma migrate deploy", { stdio: "inherit" });
    console.log("✅ Migrations appliquées");
  } catch (e) {
    console.log("⚠️ Migration erreur:", e);
  }

  // 2. Seed ensuite — les tables existent maintenant
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
    if (count > 0) {
      console.log("ℹ️ Super Admin existe deja");
      await prisma.$disconnect();
      return;
    }

    const labs = ["lic-pharma","medisure","sigma","ephaco","stallion"];
    for (const name of labs) {
      await prisma.laboratory.upsert({ where:{name}, update:{}, create:{name} });
    }
    console.log("✅ 5 laboratoires créés");

    const grossistes = ["tedis","copharmed","laborex","dpci"];
    for (const name of grossistes) {
      await prisma.grossiste.upsert({ where:{name}, update:{}, create:{name} });
    }
    console.log("✅ 4 grossistes créés");

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
    console.log("✅ 26 produits créés");

    const sa = await prisma.user.findFirst({ where:{ role:"SUPER_ADMIN" } });
    if (!sa) {
      const hash = await bcrypt.hash("SuperAdmin@2025!", 12);
      await prisma.user.create({
        data: {
          email:     "superadmin@inoxpharma.com",
          password:  hash,
          firstName: "Super",
          lastName:  "Admin",
          role:      "SUPER_ADMIN",
        }
      });
      console.log("✅ Super Admin cree : superadmin@inoxpharma.com");
    }

    console.log("🎉 Base initialisee avec succes !");
  } catch(e) {
    console.log("⚠️ Seed erreur:", e);
  } finally {
    await prisma.$disconnect();
  }
};

// Lancer l'initialisation puis démarrer le serveur
initDb();

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes API ───────────────────────────────────────────────
app.use("/api/auth",        authRoutes);
app.use("/api/users",       userRoutes);
app.use("/api/delegates",   delegateRoutes);
app.use("/api/reports",     reportRoutes);
app.use("/api/gps",         gpsRoutes);
app.use("/api/grossistes",  grossisteRoutes);
app.use("/api/laboratories",labRoutes);
app.use("/api/pharmacies",  pharmacyRoutes);
app.use("/api/products",    productRoutes);
app.use("/api/planning",    planningRoutes);
app.use("/api/stats",       statsRoutes);
app.use("/api/sectors",     sectorRoutes);

// ── Socket GPS ───────────────────────────────────────────────
setupGPSSocket(io);

// ── Health check ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "INOX PHARMA API running", db: "MySQL (XAMPP)" });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`✅ INOX PHARMA Server → http://localhost:${PORT}`);
  console.log(`   Base de données  → MySQL (XAMPP) / inoxpharma`);
  console.log(`   Frontend attendu → ${process.env.FRONTEND_URL}`);
});

export { io };
