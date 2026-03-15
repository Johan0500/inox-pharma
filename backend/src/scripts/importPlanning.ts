import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import path from "path";

const prisma = new PrismaClient();
const DATA = path.join(__dirname, "../../../data/");

// Zones du séminier → correspondent aux zones des délégués
const ZONE_TO_DELEGATE_ZONE: Record<string, string> = {
  "YOPOUGON":              "YOPOUGON",
  "MARCORY 2":             "MARCORY - KOUMASSI - PORT BOUET - VRIDI",
  "MARCORY I":             "MARCORY - KOUMASSI - PORT BOUET - VRIDI",
  "KOUMASSI ":             "MARCORY - KOUMASSI - PORT BOUET - VRIDI",
  "PORTBOUET":             "MARCORY - KOUMASSI - PORT BOUET - VRIDI",
  "COCODY-RIVIERA-BINGER": "COCODY - 2PLATEAUX - RIVIERA - PALMERAIE - BINGERVILLE",
  "ADJAME ATTECOUBE WILLY":"ADJAME WILLIAMSVILLE - PLATEAU",
  "PLATEAU":               "ADJAME WILLIAMSVILLE - PLATEAU",
  "TREICHVILLE":           "TREICHVILLE",
  "CHU":                   "TREICHVILLE",
  "ABOBO-ANYAMA":          "ABOBO - ANYAMA",
};

async function importSemenier() {
  const filePath = DATA + "SEMENIER_ABIDJAN_INOXPHARMA_MAI_2024_Modifié_2.xlsx";

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.readFile(filePath);
  } catch {
    console.error("❌ Fichier SEMENIER introuvable:", filePath);
    console.log("   Vérifiez que le fichier est dans le dossier data/");
    return;
  }

  let totalCreated = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    let currentWeek = 0;
    let lundi: string[]    = [];
    let mardi: string[]    = [];
    let mercredi: string[] = [];
    let jeudi: string[]    = [];
    let vendredi: string[] = [];

    const zone = ZONE_TO_DELEGATE_ZONE[sheetName.trim()] || sheetName.trim();

    const saveWeek = async () => {
      if (currentWeek <= 0) return;
      await prisma.weeklyPlanning.create({
        data: {
          delegateId: "system",   // Placeholder — à remplacer par l'ID réel du délégué
          weekNumber: currentWeek,
          zone: sheetName.trim(),
          lundi:    lundi.filter((s) => s.trim()).join("\n"),
          mardi:    mardi.filter((s) => s.trim()).join("\n"),
          mercredi: mercredi.filter((s) => s.trim()).join("\n"),
          jeudi:    jeudi.filter((s) => s.trim()).join("\n"),
          vendredi: vendredi.filter((s) => s.trim()).join("\n"),
          month:    "2024-05",
        },
      }).catch(() => {});
      totalCreated++;
    };

    for (const row of raw) {
      const col1 = String(row[1] || "").trim();

      if (col1.toUpperCase().includes("SEMAINE")) {
        await saveWeek();
        currentWeek++;
        lundi    = [String(row[2] || "")];
        mardi    = [String(row[3] || "")];
        mercredi = [String(row[4] || "")];
        jeudi    = [String(row[5] || "")];
        vendredi = [String(row[6] || "")];
      } else if (currentWeek > 0 && row.some((c: any) => c)) {
        if (row[2]) lundi.push(String(row[2]));
        if (row[3]) mardi.push(String(row[3]));
        if (row[4]) mercredi.push(String(row[4]));
        if (row[5]) jeudi.push(String(row[5]));
        if (row[6]) vendredi.push(String(row[6]));
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
