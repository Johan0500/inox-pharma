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
// Zones du séminier → correspondent aux zones des délégués
const ZONE_TO_DELEGATE_ZONE = {
    "YOPOUGON": "YOPOUGON",
    "MARCORY 2": "MARCORY - KOUMASSI - PORT BOUET - VRIDI",
    "MARCORY I": "MARCORY - KOUMASSI - PORT BOUET - VRIDI",
    "KOUMASSI ": "MARCORY - KOUMASSI - PORT BOUET - VRIDI",
    "PORTBOUET": "MARCORY - KOUMASSI - PORT BOUET - VRIDI",
    "COCODY-RIVIERA-BINGER": "COCODY - 2PLATEAUX - RIVIERA - PALMERAIE - BINGERVILLE",
    "ADJAME ATTECOUBE WILLY": "ADJAME WILLIAMSVILLE - PLATEAU",
    "PLATEAU": "ADJAME WILLIAMSVILLE - PLATEAU",
    "TREICHVILLE": "TREICHVILLE",
    "CHU": "TREICHVILLE",
    "ABOBO-ANYAMA": "ABOBO - ANYAMA",
};
async function importSemenier() {
    const filePath = DATA + "SEMENIER_ABIDJAN_INOXPHARMA_MAI_2024_Modifié_2.xlsx";
    let wb;
    try {
        wb = XLSX.readFile(filePath);
    }
    catch {
        console.error("❌ Fichier SEMENIER introuvable:", filePath);
        console.log("   Vérifiez que le fichier est dans le dossier data/");
        return;
    }
    let totalCreated = 0;
    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        let currentWeek = 0;
        let lundi = [];
        let mardi = [];
        let mercredi = [];
        let jeudi = [];
        let vendredi = [];
        const zone = ZONE_TO_DELEGATE_ZONE[sheetName.trim()] || sheetName.trim();
        const saveWeek = async () => {
            if (currentWeek <= 0)
                return;
            await prisma.weeklyPlanning.create({
                data: {
                    delegateId: "system", // Placeholder — à remplacer par l'ID réel du délégué
                    weekNumber: currentWeek,
                    zone: sheetName.trim(),
                    lundi: lundi.filter((s) => s.trim()).join("\n"),
                    mardi: mardi.filter((s) => s.trim()).join("\n"),
                    mercredi: mercredi.filter((s) => s.trim()).join("\n"),
                    jeudi: jeudi.filter((s) => s.trim()).join("\n"),
                    vendredi: vendredi.filter((s) => s.trim()).join("\n"),
                    month: "2024-05",
                },
            }).catch(() => { });
            totalCreated++;
        };
        for (const row of raw) {
            const col1 = String(row[1] || "").trim();
            if (col1.toUpperCase().includes("SEMAINE")) {
                await saveWeek();
                currentWeek++;
                lundi = [String(row[2] || "")];
                mardi = [String(row[3] || "")];
                mercredi = [String(row[4] || "")];
                jeudi = [String(row[5] || "")];
                vendredi = [String(row[6] || "")];
            }
            else if (currentWeek > 0 && row.some((c) => c)) {
                if (row[2])
                    lundi.push(String(row[2]));
                if (row[3])
                    mardi.push(String(row[3]));
                if (row[4])
                    mercredi.push(String(row[4]));
                if (row[5])
                    jeudi.push(String(row[5]));
                if (row[6])
                    vendredi.push(String(row[6]));
            }
        }
        await saveWeek();
        console.log(`  ✅ ${sheetName}: ${currentWeek} semaines`);
    }
    console.log(`\n🎉 Planning importé: ${totalCreated} entrées créées`);
    console.log("   Note: delegateId = 'system' (placeholder)");
    console.log("   Assignez les vrais IDs depuis l'interface admin.");
}
importSemenier()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
