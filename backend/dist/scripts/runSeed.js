"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Seed démarré...");
    // Vérifier si déjà seedé
    const existing = await prisma.laboratory.count();
    if (existing > 0) {
        console.log("ℹ️ Données déjà présentes — seed ignoré");
        return;
    }
    // Laboratoires
    const labs = ["lic-pharma", "medisure", "sigma", "ephaco", "stallion"];
    for (const name of labs) {
        await prisma.laboratory.upsert({ where: { name }, update: {}, create: { name } });
    }
    console.log("✅ 5 laboratoires créés");
    // Grossistes
    const grossistes = ["tedis", "copharmed", "laborex", "dpci"];
    for (const name of grossistes) {
        await prisma.grossiste.upsert({ where: { name }, update: {}, create: { name } });
    }
    console.log("✅ 4 grossistes créés");
    // Produits
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
    // Super Admin
    const existing_sa = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
    if (!existing_sa) {
        const hash = await bcryptjs_1.default.hash("SuperAdmin@2025!", 12);
        await prisma.user.create({
            data: {
                email: "superadmin@inoxpharma.com",
                password: hash,
                firstName: "Super",
                lastName: "Admin",
                role: "SUPER_ADMIN",
            },
        });
        console.log("✅ Super Admin cree");
    }
    console.log("🎉 Seed termine !");
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
