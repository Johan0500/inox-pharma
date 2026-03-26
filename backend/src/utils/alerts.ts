import { PrismaClient } from "@prisma/client";
import { sendEmail, alertInactiveDelegateEmail } from "./mailer";
import { notifyAdmins } from "../routes/notifications";

const prisma = new PrismaClient();

export async function checkInactiveDelegates() {
  try {
    const DAYS_THRESHOLD = 3; // Alerte après 3 jours sans rapport
    const thresholdDate  = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - DAYS_THRESHOLD);

    const delegates = await prisma.delegate.findMany({
      include: {
        user:      { select: { firstName: true, lastName: true } },
        visitReports: {
          orderBy: { visitDate: "desc" },
          take:    1,
        },
      },
    });

    const superAdmins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { email: true },
    });

    for (const d of delegates) {
      const lastReport    = d.visitReports[0];
      const lastReportDate = lastReport ? new Date(lastReport.visitDate) : null;
      const isInactive    = !lastReportDate || lastReportDate < thresholdDate;

      if (isInactive) {
        const daysSince = lastReportDate
          ? Math.floor((Date.now() - lastReportDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const delegateName = `${d.user.firstName} ${d.user.lastName}`;
        const lastDateStr  = lastReportDate
          ? lastReportDate.toLocaleDateString("fr-FR")
          : null;

        // Envoyer email aux super admins
        for (const admin of superAdmins) {
          await sendEmail(
            admin.email,
            `⚠️ Délégué inactif : ${delegateName}`,
            alertInactiveDelegateEmail(delegateName, d.zone, lastDateStr, daysSince)
          );
        }

        // Notification push aux admins
        await notifyAdmins(
          "⚠️ Délégué inactif",
          `${delegateName} (${d.zone}) n'a pas soumis de rapport depuis ${daysSince} jour(s)`,
          "/dashboard"
        );

        console.log(`🔔 Alerte envoyée pour ${delegateName} — inactif depuis ${daysSince} jours`);
      }
    }
  } catch (err) {
    console.error("Erreur alertes délégués:", err);
  }
}