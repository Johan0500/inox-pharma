"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInactiveDelegates = checkInactiveDelegates;
const client_1 = require("@prisma/client");
const mail_1 = __importDefault(require("@sendgrid/mail"));
const prisma = new client_1.PrismaClient();
const FROM_EMAIL = process.env.SMTP_FROM || "noreply@inoxpharma.com";
if (process.env.SENDGRID_API_KEY) {
    mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
}
async function checkInactiveDelegates() {
    try {
        const DAYS_THRESHOLD = 3;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - DAYS_THRESHOLD);
        const delegates = await prisma.delegate.findMany({
            include: {
                user: { select: { firstName: true, lastName: true } },
                visitReports: { orderBy: { visitDate: "desc" }, take: 1 },
            },
        });
        const superAdmins = await prisma.user.findMany({
            where: { role: "SUPER_ADMIN", isActive: true },
            select: { email: true },
        });
        for (const d of delegates) {
            const lastReport = d.visitReports[0];
            const lastDate = lastReport ? new Date(lastReport.visitDate) : null;
            const isInactive = !lastDate || lastDate < thresholdDate;
            if (isInactive) {
                const daysSince = lastDate
                    ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
                    : 999;
                const delegateName = `${d.user.firstName} ${d.user.lastName}`;
                console.log(`🔔 Alerte : ${delegateName} inactif depuis ${daysSince} jours`);
                // Envoyer email seulement si SendGrid est configuré
                if (process.env.SENDGRID_API_KEY) {
                    for (const admin of superAdmins) {
                        try {
                            await mail_1.default.send({
                                to: admin.email,
                                from: { email: FROM_EMAIL, name: "INOX PHARMA" },
                                subject: `⚠️ Délégué inactif : ${delegateName}`,
                                html: `
                  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                    <div style="background:#064e3b;padding:20px;border-radius:8px 8px 0 0;text-align:center">
                      <h1 style="color:white;margin:0;font-size:18px">🏥 INOX PHARMA</h1>
                    </div>
                    <div style="background:#fef2f2;border:1px solid #fecaca;padding:20px;border-radius:0 0 8px 8px">
                      <h2 style="color:#dc2626;font-size:16px">⚠️ Délégué inactif depuis ${daysSince} jour(s)</h2>
                      <p style="color:#374151">
                        Le délégué <strong>${delegateName}</strong> (zone: ${d.zone})
                        n'a pas soumis de rapport depuis <strong>${daysSince} jours</strong>.
                      </p>
                      ${lastDate
                                    ? `<p style="color:#6b7280">Dernier rapport : ${lastDate.toLocaleDateString("fr-FR")}</p>`
                                    : `<p style="color:#dc2626">Aucun rapport soumis.</p>`}
                    </div>
                  </div>
                `,
                            });
                        }
                        catch (emailErr) {
                            console.error(`❌ Email alerte échoué:`, emailErr?.message);
                        }
                    }
                }
            }
        }
    }
    catch (err) {
        console.error("Erreur checkInactiveDelegates:", err);
    }
}
