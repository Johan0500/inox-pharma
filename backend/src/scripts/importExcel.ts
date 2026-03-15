import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import path from "path";

const prisma = new PrismaClient();
const DATA = path.join(__dirname, "../../../data/");

// ── HELPER : nettoyer les chaînes ─────────────────────────────
function clean(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim().replace(/\s+/g, " ");
}

// ── IMPORTER DPCI ─────────────────────────────────────────────
async function importDPCI() {
  const grossiste = await prisma.grossiste.findUnique({ where: { name: "dpci" } });
  if (!grossiste) throw new Error("Grossiste 'dpci' non trouvé — lancez d'abord: npm run db:seed");

  let filePath = DATA + "Client_DPCI_Actif.xlsx";
  const wb = XLSX.readFile(filePath);
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

  let count = 0;
  let errors = 0;

  for (const row of rows) {
    const code = clean(row["CODE_CLIENT"]);
    const nom  = clean(row["NOM_PHARMACIE"] || row["NOM_CLIENT"]);
    if (!code || !nom) continue;

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
          codeClient:  code,
          nom,
          pharmacien:  clean(row["NOM_CLIENT"]),
          ville:       clean(row["VILLE"]),
        },
      });
      count++;
    } catch {
      errors++;
    }
  }
  console.log(`  ✅ DPCI: ${count} importées, ${errors} erreurs`);
}

// ── IMPORTER COPHARMED ────────────────────────────────────────
async function importCopharmed() {
  const grossiste = await prisma.grossiste.findUnique({ where: { name: "copharmed" } });
  if (!grossiste) throw new Error("Grossiste 'copharmed' non trouvé");

  const wb = XLSX.readFile(DATA + "liste_client_copharmed.xlsx");
  const raw: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    defval: "",
  });

  let count = 0;
  let errors = 0;

  // Structure: [vide, num, code_client, nom_client, region, pharmacien, province]
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    const code = clean(r[2]);
    const nom  = clean(r[3]);
    if (!code || !nom) continue;

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
          region:     clean(r[4]),
          province:   clean(r[6]),
        },
        create: {
          grossisteId: grossiste.id,
          codeClient:  code,
          nom,
          pharmacien:  clean(r[5]),
          region:      clean(r[4]),
          province:    clean(r[6]),
        },
      });
      count++;
    } catch {
      errors++;
    }
  }
  console.log(`  ✅ COPHARMED: ${count} importées, ${errors} erreurs`);
}

// ── IMPORTER LABOREX (utilise CLIT_MAJ.xlsx — le plus complet) ─
async function importLaborex() {
  const grossiste = await prisma.grossiste.findUnique({ where: { name: "laborex" } });
  if (!grossiste) throw new Error("Grossiste 'laborex' non trouvé");

  const wb = XLSX.readFile(DATA + "CLIT_MAJ.xlsx");
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

  let count = 0;
  let errors = 0;

  for (const row of rows) {
    const code = clean(row["Client"]);
    const lib  = clean(row["Libellé"]);
    if (!code || !lib) continue;

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
          codeClient:  code,
          nom:         "PHARMACIE " + lib,
          pharmacien:  clean(row["Nom"]),
          adresse:     clean(row["Adresse 1"]),
          ville:       clean(row["Ville"]),
          region:      clean(row["Région"]),
          telephone:   clean(row["Téléphone"]),
          email:       clean(row["E-MAIL"]),
        },
      });
      count++;
    } catch {
      errors++;
    }
  }
  console.log(`  ✅ LABOREX (CLIT_MAJ): ${count} importées, ${errors} erreurs`);
}

// ── IMPORTER PHARMACIE_LABOREX.xlsx (données supplémentaires) ──
async function importPharmaciesLaborex2() {
  const grossiste = await prisma.grossiste.findUnique({ where: { name: "laborex" } });
  if (!grossiste) return;

  try {
    const wb = XLSX.readFile(DATA + "pharmacie_laborex.xlsx");
    const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

    let count = 0;
    for (const row of rows) {
      const code = clean(row["Client"]);
      const lib  = clean(row["Libellé"]);
      if (!code || !lib) continue;

      await prisma.pharmacy.upsert({
        where: {
          grossisteId_codeClient: { grossisteId: grossiste.id, codeClient: code },
        },
        update: {},
        create: {
          grossisteId: grossiste.id,
          codeClient:  code,
          nom:         "PHARMACIE " + lib,
          pharmacien:  clean(row["Nom"]),
          ville:       clean(row["Ville"]),
          region:      clean(row["Région"]),
        },
      }).catch(() => {});
      count++;
    }
    console.log(`  ✅ LABOREX 2 (pharmacie_laborex): ${count} traitées`);
  } catch {
    console.log("  ⚠️  pharmacie_laborex.xlsx: fichier introuvable ou erreur, ignoré");
  }
}

// ── LANCER TOUT ───────────────────────────────────────────────
async function main() {
  console.log("📥 Démarrage import Excel → MySQL (XAMPP)...\n");

  try { await importDPCI(); }
  catch (e: any) { console.error("  ❌ DPCI:", e.message); }

  try { await importCopharmed(); }
  catch (e: any) { console.error("  ❌ COPHARMED:", e.message); }

  try { await importLaborex(); }
  catch (e: any) { console.error("  ❌ LABOREX:", e.message); }

  try { await importPharmaciesLaborex2(); }
  catch (e: any) { console.error("  ❌ LABOREX 2:", e.message); }

  // Compter le total
  const total = await prisma.pharmacy.count();
  console.log(`\n🎉 Import terminé ! Total en base: ${total} pharmacies`);
}

main()
  .catch((e) => { console.error("❌ Erreur import:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
