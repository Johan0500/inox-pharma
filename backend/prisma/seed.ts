import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Démarrage du seed INOX PHARMA...");

  // ── 1. LABORATOIRES ──────────────────────────────────────────
  const labNames = ["lic-pharma", "medisure", "sigma", "ephaco", "stallion"];
  for (const name of labNames) {
    await prisma.laboratory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("✅ 5 laboratoires créés");

  // ── 2. GROSSISTES ────────────────────────────────────────────
  const grossisteNames = ["tedis", "copharmed", "laborex", "dpci"];
  for (const name of grossisteNames) {
    await prisma.grossiste.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("✅ 4 grossistes créés");

  // ── 3. SECTEURS (depuis SECTORISATION_PAYS_2026.xlsx) ────────
  const sectors = [
    // ZONE ABIDJAN
    {
      id: "sector-abj-1",
      numero: 1,
      delegateName: "MANGNY MORY GUY ROLAND",
      zoneResidence: "ABOBO - ANYAMA",
      peripherie: "AZAGUIE - EGLIN - ABIE - AHOUE - MONTEZO - MIMNI - DANGUIRA - DOMOLON",
      axesMission: "AZAGUIE - Grd YAPO - AGBOVILLE - CECHI - RUBINO - ORESS KROBOU - LOVIGUIE - OFFA - ALEPE",
      type: "ABIDJAN",
    },
    {
      id: "sector-abj-2",
      numero: 2,
      delegateName: "SAMIRA JABER / OUATTARA CHRISTELLE",
      zoneResidence: "YOPOUGON",
      peripherie: "SONGON - JACQUEVILLE - DABOU - NOUVELLE ZONE IND DE YOP - ATTEINGUIE",
      axesMission: "AXE DABOU - DEBRENOU - ORBAPH - LOPOU - KOSROU - TOUPA - GRD LAHOU - SIKENSI - TIASSALE",
      type: "ABIDJAN",
    },
    {
      id: "sector-abj-3",
      numero: 3,
      delegateName: "ASSEMIEN AKOUASSI / COULIBALY LACINA",
      zoneResidence: "COCODY - 2PLATEAUX - RIVIERA - PALMERAIE - BINGERVILLE",
      peripherie: "ADJIN - EBRA - ELOKA - PALMAFRIC",
      axesMission: "",
      type: "ABIDJAN",
    },
    {
      id: "sector-abj-4",
      numero: 4,
      delegateName: "Mme AMANI DJADJA / BAMBA MASSANDJE",
      zoneResidence: "ADJAME WILLIAMSVILLE - PLATEAU",
      peripherie: "ADJAME WILLIAMSVILLE - PLATEAU",
      axesMission: "ADJAME WILLIAMSVILLE - PLATEAU",
      type: "ABIDJAN",
    },
    {
      id: "sector-abj-5",
      numero: 5,
      delegateName: "ACHY KOUA PAULE ANGEL",
      zoneResidence: "TREICHEVILLE",
      peripherie: "TREICHVILLE",
      axesMission: "TREICHVILLE",
      type: "ABIDJAN",
    },
    {
      id: "sector-abj-6",
      numero: 6,
      delegateName: "ABINAN DIEUDONNE",
      zoneResidence: "MARCORY - KOUMASSI - PORT BOUET - VRIDI",
      peripherie: "BASSAM - AYAHOU - BONOUA",
      axesMission: "AXE BONOUA - ADIAKE",
      type: "ABIDJAN",
    },
    // ZONES PROVINCIALES
    {
      id: "sector-prov-1",
      numero: 7,
      delegateName: "BRINA ANICET",
      zoneResidence: "ABENGOUROU",
      peripherie: "ANUASSUE - SCA - NIABLE - AMELEKIA - TANGUELAN - SANKADIOKRO - YAKASSE-FEYASSE - DOUFREBO",
      axesMission: "AGNIBILEKRO - KOUN-FAO - TRANSUA - TANDA - GOUMERE - BONDOUKOU - BOUNA - DOROPO - TEHINI",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-2",
      numero: 8,
      delegateName: "KALMOGO ROSALIE",
      zoneResidence: "ABOISSO",
      peripherie: "N'ZI KRO - KOFFI KRO - AYAME - BIANOUAN",
      axesMission: "MAFERE - AKAKRO - EHANIEN - NOE - TIAPOUN - YAOU - BETTIE",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-3",
      numero: 9,
      delegateName: "AKOITRO ALAIN",
      zoneResidence: "ADZOPE",
      peripherie: "BECEDI BRIGNAN - BECEDI AMON - BOUDEPE - GRAND AKOUZIN - ANDE - DIAPE - YAKASSE ME - AKOUPE - AFFERY",
      axesMission: "YAKASSE ATTOBROU - BONAOUIN - ARRAH - KOTOBI",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-4",
      numero: 10,
      delegateName: "N'GUETTIA MELANIE / KOUAME ROLAND",
      zoneResidence: "BOUAKE",
      peripherie: "DJEBONOUA - BROBO - BOTRO - DIABO - LANGUIBONOU - KOUASSIBLEKRO - KOGOSOU - BEOUMI - KATIOLA",
      axesMission: "KOUNAHIRI - MBAHIAKRO - DABAKALA - NIAKARA - BOUANDOUGOU - DIDIEVI - PRIKRO",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-5",
      numero: 11,
      delegateName: "TIEDE BAHI JUNIOR",
      zoneResidence: "DALOA",
      peripherie: "BONON - BEDIALA - DANIA - PELEZI - SEITIFLA - GUESSABO - ZOUKOUGBEU - VAVOUA - SIKABOUTOU",
      axesMission: "ISSIA - SAIOU",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-6",
      numero: 12,
      delegateName: "BROU LOUKOU",
      zoneResidence: "GAGNOA",
      peripherie: "OURAGAHIO - BAYOTA - GUIBEROUA - LAKOTA - ZIKISSO - SINFRA - DIEGONEFLA - OUME - DIGNANGO",
      axesMission: "GUITRY - OUME - HIRE - HEREMANKONO - DIVO - KONONFLA",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-7",
      numero: 13,
      delegateName: "KOUAKOU FRANCOIS",
      zoneResidence: "SEGUELA",
      peripherie: "MASALA - DUALLA - SIFIE",
      axesMission: "WOROFLA - KANI - MAKONO - SIFIE - DIANRA",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-8",
      numero: 14,
      delegateName: "ABOUA LAURENT",
      zoneResidence: "DUEKOUE",
      peripherie: "GUEZON - BAGOHOUO",
      axesMission: "GUIGLO - BANGOLO - KOUIBLY - FACOBLY - BLOLEQUIN - GBAPLEU - TOULEPLEU - TAI",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-9",
      numero: 15,
      delegateName: "KOFFI JOSIANE / N'GUESSAN NINA",
      zoneResidence: "KORHOGO",
      peripherie: "SINEMATIALI - SEDIOGO - KOMBORO - KARAKORO - DIKODOUGOU - TIORO NAPIE - GUIEMBE",
      axesMission: "SIRASSO - BOUNDIALI - TENGRELA - FERKE - TAFIERA - OUANGOLO - DIAWALA - NIELE - KONG",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-10",
      numero: 16,
      delegateName: "N'GUESSAN DONATIEN",
      zoneResidence: "MAN",
      peripherie: "BANGOLO - MAHAPLEU - BIANKOUMA - FACOBLY",
      axesMission: "BIANKOUMA - TOUBA - BOROTOU - ODIENNE - DANANE - SIPILOU - OUANINOU - GBELEBAN - MINIGNAN",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-11",
      numero: 17,
      delegateName: "LEGRE SAMUEL / ADJIGNON DONATIEN",
      zoneResidence: "SAN PEDRO",
      peripherie: "GABIADJI - GRAND BEREBY - SASSANDRA",
      axesMission: "FRESCO - TABOU - NEKA",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-12",
      numero: 18,
      delegateName: "DIOMANDE PAUL",
      zoneResidence: "GRABO",
      peripherie: "GRABO",
      axesMission: "GNATO",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-13",
      numero: 19,
      delegateName: "KOUAME ANDERSON",
      zoneResidence: "SOUBRE",
      peripherie: "GBAKAYO - YABAYO - ZATRI - OKROUYO - OUPOYO - MEAGUY - SARAKADJI - WALEBO",
      axesMission: "BUYO - TOUIH - GUEYO - GABIADJI - SAGO - DAPKADOU - MOUSSADOUGOU",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-14",
      numero: 20,
      delegateName: "KOUADIO ADELE",
      zoneResidence: "YAMOUSSOUKRO",
      peripherie: "TOUMODI - TIEBISSOU - KOKOUMBO - DJEKANOU - BAZRE - KONEFLA",
      axesMission: "DIMBOKRO - BOCANDA - BONGOUANOU - DAOUKRO - OUELLE - PRIKRO - BOUAFLE - ZUENOULA",
      type: "PROVINCE",
    },
    {
      id: "sector-prov-15",
      numero: 21,
      delegateName: "SAHIN NADEGE",
      zoneResidence: "AGBOVILLE",
      peripherie: "AZAGUIE - Grd YAPO - CECHI - RUBINO - ORESS KROBOU - LOVIGUIE - OFFA",
      axesMission: "RUBINO",
      type: "PROVINCE",
    },
  ];

  for (const s of sectors) {
    await prisma.sector.upsert({
      where: { id: s.id },
      update: { delegateName: s.delegateName },
      create: s,
    });
  }
  console.log("✅ 21 secteurs créés (6 Abidjan + 15 Provinces)");

  // ── 4. PRODUITS (depuis STRATEGIE_I_Par_Spécialété.xlsx) ─────
  const products = [
    // GROUPE 1
    { name: "CROCIP-TZ",   group: "GROUPE 1", specialty: "CHIRURGIE" },
    { name: "ACICROF-P",   group: "GROUPE 1", specialty: "CHIRURGIE" },
    { name: "PIRRO",       group: "GROUPE 1", specialty: "CHIRURGIE" },
    { name: "ROLIK",       group: "GROUPE 1", specialty: "CHIRURGIE" },
    { name: "FEROXYDE",    group: "GROUPE 1", specialty: "CHIRURGIE" },
    { name: "HEAMOCARE",   group: "GROUPE 1", specialty: "CHIRURGIE" },
    { name: "CYPRONURAN",  group: "GROUPE 1", specialty: "CHIRURGIE" },
    { name: "AZIENT",      group: "GROUPE 1", specialty: "NEPHROLOGIE" },
    { name: "CROZOLE",     group: "GROUPE 1", specialty: "NEPHROLOGIE" },
    // GROUPE 2
    { name: "BETAMECRO",   group: "GROUPE 2", specialty: "DERMATOLOGIE" },
    { name: "BECLOZOLE",   group: "GROUPE 2", specialty: "DERMATOLOGIE" },
    { name: "KEOZOL",      group: "GROUPE 2", specialty: "DERMATOLOGIE" },
    { name: "MRITIZ",      group: "GROUPE 2", specialty: "DERMATOLOGIE" },
    { name: "GLIZAR MR",   group: "GROUPE 2", specialty: "DIABETOLOGIE" },
    { name: "CROFORMIN",   group: "GROUPE 2", specialty: "DIABETOLOGIE" },
    { name: "PREGIB",      group: "GROUPE 2", specialty: "DIABETOLOGIE" },
    // GROUPE 3
    { name: "CEXIME",      group: "GROUPE 3", specialty: "PEDIATRIE" },
    { name: "CROCILLINE",  group: "GROUPE 3", specialty: "PEDIATRIE" },
    { name: "GUAMEN",      group: "GROUPE 3", specialty: "PEDIATRIE" },
    { name: "TERCO",       group: "GROUPE 3", specialty: "PEDIATRIE" },
    { name: "CROLINI GEL", group: "GROUPE 3", specialty: "KINESIE" },
    { name: "CETAFF",      group: "GROUPE 3", specialty: "KINESIE" },
    { name: "COFEN",       group: "GROUPE 3", specialty: "KINESIE" },
    { name: "DOLBUFEN",    group: "GROUPE 3", specialty: "KINESIE" },
    // GROUPE 4
    { name: "ESOMECRO",    group: "GROUPE 4", specialty: "RHUMATOLOGIE NEURO TRAUMATO" },
    { name: "CROGENTA",    group: "GROUPE 4", specialty: "OPHTALMOLOGIE" },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: { group: p.group, specialty: p.specialty },
      create: p,
    });
  }
  console.log("✅ 26 produits créés (4 groupes, 11 spécialités)");

  // ── 5. SUPER ADMIN ───────────────────────────────────────────
  const existingSA = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!existingSA) {
    const hashed = await bcrypt.hash("SuperAdmin@2025!", 12);
    await prisma.user.create({
      data: {
        email: "superadmin@inoxpharma.com",
        password: hashed,
        firstName: "Super",
        lastName: "Admin",
        role: "SUPER_ADMIN",
      },
    });
    console.log("✅ Super Admin créé");
    console.log("   Email    : superadmin@inoxpharma.com");
    console.log("   Password : SuperAdmin@2025!");
  } else {
    console.log("ℹ️  Super Admin existe déjà");
  }

  console.log("\n🎉 Seed terminé avec succès !");
}

main()
  .catch((e) => { console.error("❌ Erreur seed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
