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
const client_1 = require("@prisma/client");
const XLSX = __importStar(require("xlsx"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
const DATA = path_1.default.join(__dirname, "../../../data/");
// ── HELPER : nettoyer les chaînes ─────────────────────────────
function clean(val) {
    if (val === null || val === undefined)
        return "";
    return String(val).trim().replace(/\s+/g, " ");
}
// ── IMPORTER DPCI ─────────────────────────────────────────────
async function importDPCI() {
    const grossiste = await prisma.grossiste.findUnique({ where: { name: "dpci" } });
    if (!grossiste)
        throw new Error("Grossiste 'dpci' non trouvé — lancez d'abord: npm run db:seed");
    let filePath = DATA + "Client_DPCI_Actif.xlsx";
    const wb = XLSX.readFile(filePath);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    let count = 0;
    let errors = 0;
    for (const row of rows) {
        const code = clean(row["CODE_CLIENT"]);
        const nom = clean(row["NOM_PHARMACIE"] || row["NOM_CLIENT"]);
        if (!code || !nom)
            continue;
        try {
            await prisma.pharmacy.upsert({
                where: {
                    grossisteId_codeClient: {
                        grossisteId: grossiste.id,
                        codeClient: code,
                    },
                },
                update: {
                    nom,
                    pharmacien: clean(row["NOM_CLIENT"]),
                    ville: clean(row["VILLE"]),
                },
                create: {
                    grossisteId: grossiste.id,
                    codeClient: code,
                    nom,
                    pharmacien: clean(row["NOM_CLIENT"]),
                    ville: clean(row["VILLE"]),
                },
            });
            count++;
        }
        catch {
            errors++;
        }
    }
    console.log(`  ✅ DPCI: ${count} importées, ${errors} erreurs`);
}
// ── IMPORTER COPHARMED ────────────────────────────────────────
async function importCopharmed() {
    const grossiste = await prisma.grossiste.findUnique({ where: { name: "copharmed" } });
    if (!grossiste)
        throw new Error("Grossiste 'copharmed' non trouvé");
    const wb = XLSX.readFile(DATA + "liste_client_copharmed.xlsx");
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
        header: 1,
        defval: "",
    });
    let count = 0;
    let errors = 0;
    // Structure: [vide, num, code_client, nom_client, region, pharmacien, province]
    for (let i = 1; i < raw.length; i++) {
        const r = raw[i];
        const code = clean(r[2]);
        const nom = clean(r[3]);
        if (!code || !nom)
            continue;
        try {
            await prisma.pharmacy.upsert({
                where: {
                    grossisteId_codeClient: {
                        grossisteId: grossiste.id,
                        codeClient: code,
                    },
                },
                update: {
                    nom,
                    pharmacien: clean(r[5]),
                    region: clean(r[4]),
                    province: clean(r[6]),
                },
                create: {
                    grossisteId: grossiste.id,
                    codeClient: code,
                    nom,
                    pharmacien: clean(r[5]),
                    region: clean(r[4]),
                    province: clean(r[6]),
                },
            });
            count++;
        }
        catch {
            errors++;
        }
    }
    console.log(`  ✅ COPHARMED: ${count} importées, ${errors} erreurs`);
}
// ── IMPORTER LABOREX (utilise CLIT_MAJ.xlsx — le plus complet) ─
async function importLaborex() {
    const grossiste = await prisma.grossiste.findUnique({ where: { name: "laborex" } });
    if (!grossiste)
        throw new Error("Grossiste 'laborex' non trouvé");
    const wb = XLSX.readFile(DATA + "CLIT_MAJ.xlsx");
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    let count = 0;
    let errors = 0;
    for (const row of rows) {
        const code = clean(row["Client"]);
        const lib = clean(row["Libellé"]);
        if (!code || !lib)
            continue;
        try {
            await prisma.pharmacy.upsert({
                where: {
                    grossisteId_codeClient: {
                        grossisteId: grossiste.id,
                        codeClient: code,
                    },
                },
                update: {},
                create: {
                    grossisteId: grossiste.id,
                    codeClient: code,
                    nom: "PHARMACIE " + lib,
                    pharmacien: clean(row["Nom"]),
                    adresse: clean(row["Adresse 1"]),
                    ville: clean(row["Ville"]),
                    region: clean(row["Région"]),
                    telephone: clean(row["Téléphone"]),
                    email: clean(row["E-MAIL"]),
                },
            });
            count++;
        }
        catch {
            errors++;
        }
    }
    console.log(`  ✅ LABOREX (CLIT_MAJ): ${count} importées, ${errors} erreurs`);
}
// ── IMPORTER PHARMACIE_LABOREX.xlsx (données supplémentaires) ──
async function importPharmaciesLaborex2() {
    const grossiste = await prisma.grossiste.findUnique({ where: { name: "laborex" } });
    if (!grossiste)
        return;
    try {
        const wb = XLSX.readFile(DATA + "pharmacie_laborex.xlsx");
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        let count = 0;
        for (const row of rows) {
            const code = clean(row["Client"]);
            const lib = clean(row["Libellé"]);
            if (!code || !lib)
                continue;
            await prisma.pharmacy.upsert({
                where: {
                    grossisteId_codeClient: { grossisteId: grossiste.id, codeClient: code },
                },
                update: {},
                create: {
                    grossisteId: grossiste.id,
                    codeClient: code,
                    nom: "PHARMACIE " + lib,
                    pharmacien: clean(row["Nom"]),
                    ville: clean(row["Ville"]),
                    region: clean(row["Région"]),
                },
            }).catch(() => { });
            count++;
        }
        console.log(`  ✅ LABOREX 2 (pharmacie_laborex): ${count} traitées`);
    }
    catch {
        console.log("  ⚠️  pharmacie_laborex.xlsx: fichier introuvable ou erreur, ignoré");
    }
}
// ── LANCER TOUT ───────────────────────────────────────────────
async function main() {
    console.log("📥 Démarrage import Excel → MySQL (XAMPP)...\n");
    try {
        await importDPCI();
    }
    catch (e) {
        console.error("  ❌ DPCI:", e.message);
    }
    try {
        await importCopharmed();
    }
    catch (e) {
        console.error("  ❌ COPHARMED:", e.message);
    }
    try {
        await importLaborex();
    }
    catch (e) {
        console.error("  ❌ LABOREX:", e.message);
    }
    try {
        await importPharmaciesLaborex2();
    }
    catch (e) {
        console.error("  ❌ LABOREX 2:", e.message);
    }
    // Compter le total
    const total = await prisma.pharmacy.count();
    console.log(`\n🎉 Import terminé ! Total en base: ${total} pharmacies`);
}
main()
    .catch((e) => { console.error("❌ Erreur import:", e); process.exit(1); })
    .finally(() => prisma.$disconnect());
