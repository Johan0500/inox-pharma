import { PrismaClient } from "@prisma/client";
import ExcelJS          from "exceljs";
import nodemailer       from "nodemailer";

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || "smtp.gmail.com",
  port:   parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendMorningConnectionReport() {
  try {
    const today     = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    // Récupérer les connexions du matin
    const logins = await prisma.loginHistory.findMany({
      where:   { createdAt: { gte: startOfDay }, success: true },
      include: { user: { select: { firstName: true, lastName: true, role: true, delegate: { include: { sector: true } } } } },
      orderBy: { createdAt: "asc" },
    });

    if (logins.length === 0) {
      console.log("📧 Aucune connexion ce matin — email annulé");
      return;
    }

    // Créer le fichier Excel
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Connexions du matin");

    // En-tête
    ws.mergeCells("A1:E1");
    const title = ws.getCell("A1");
    title.value     = `INOX PHARMA — Connexions du ${today.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })}`;
    title.font      = { bold: true, size: 13, color: { argb: "FFFFFF" } };
    title.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "064E3B" } };
    title.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 28;

    // Colonnes
    ws.addRow(["Nom", "Prénom", "Rôle", "Zone / Secteur", "Heure de connexion"]);
    const headerRow = ws.getRow(2);
    headerRow.font      = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "065F46" } };
    headerRow.alignment = { horizontal: "center" };

    // Données
    logins.forEach((l, i) => {
      const zone = l.user.delegate?.sector?.zoneResidence || l.user.delegate?.zone || "—";
      const row  = ws.addRow([
        l.user.lastName,
        l.user.firstName,
        l.user.role,
        zone,
        l.createdAt.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" }),
      ]);
      if (i % 2 === 0) {
        row.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"F0FDF4" } };
      }
    });

    // Largeurs
    ws.getColumn(1).width = 20;
    ws.getColumn(2).width = 20;
    ws.getColumn(3).width = 16;
    ws.getColumn(4).width = 25;
    ws.getColumn(5).width = 20;

    // Ligne total
    const totalRow = ws.addRow(["TOTAL", "", "", "", `${logins.length} connexion(s)`]);
    totalRow.font = { bold: true };
    totalRow.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"D1FAE5" } };

    // Exporter en buffer
    const buffer = await wb.xlsx.writeBuffer();

    // Récupérer les destinataires (super admins + admins)
    const recipients = await prisma.user.findMany({
      where:  { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
      select: { email: true, firstName: true },
    });

    const dateStr = today.toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" });

    // Envoyer l'email à chaque destinataire
    for (const recipient of recipients) {
      await transporter.sendMail({
        from:    `"INOX PHARMA" <${process.env.SMTP_USER}>`,
        to:      recipient.email,
        subject: `📊 INOX PHARMA — Rapport connexions du ${dateStr}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#064e3b,#059669);padding:24px;border-radius:12px 12px 0 0">
              <h1 style="color:white;margin:0;font-size:20px">🏥 INOX PHARMA</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px">Rapport automatique des connexions</p>
            </div>
            <div style="background:#f0fdf4;padding:24px;border:1px solid #d1fae5">
              <p style="color:#374151;font-size:14px">Bonjour <strong>${recipient.firstName}</strong>,</p>
              <p style="color:#374151;font-size:14px">
                Voici le rapport des connexions enregistrées ce matin, le <strong>${dateStr}</strong>.
              </p>
              <div style="background:white;border:1px solid #d1fae5;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:0;font-size:28px;font-weight:bold;color:#064e3b;text-align:center">${logins.length}</p>
                <p style="margin:4px 0 0;text-align:center;color:#6b7280;font-size:13px">connexion(s) aujourd'hui</p>
              </div>
              <p style="color:#6b7280;font-size:13px">
                Le fichier Excel joint contient le détail complet (nom, zone, heure de connexion).
              </p>
            </div>
            <div style="background:#064e3b;padding:16px;border-radius:0 0 12px 12px;text-align:center">
              <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0">
                INOX PHARMA © ${today.getFullYear()} — Rapport automatique — Ne pas répondre à cet email
              </p>
            </div>
          </div>
        `,
        attachments: [{
          filename:    `connexions_${today.toISOString().slice(0,10)}.xlsx`,
          content:     Buffer.from(buffer),
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }],
      });
      console.log(`📧 Email envoyé à ${recipient.email}`);
    }

    console.log(`✅ Rapport matin envoyé — ${logins.length} connexions — ${recipients.length} destinataires`);
  } catch (err) {
    console.error("❌ Erreur rapport matin:", err);
  }
}

// Planifier l'envoi automatique chaque jour à 9h30
export function scheduleMorningReport() {
  function msUntilNextSend(hour: number, minute: number): number {
    const now  = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.getTime() - now.getTime();
  }

  function scheduleNext() {
    const ms = msUntilNextSend(9, 30);
    const h  = Math.floor(ms / 3600000);
    const m  = Math.floor((ms % 3600000) / 60000);
    console.log(`📅 Prochain rapport matin dans ${h}h${m.toString().padStart(2,"0")}`);

    setTimeout(async () => {
      await sendMorningConnectionReport();
      scheduleNext(); // Replanifier pour le lendemain
    }, ms);
  }

  scheduleNext();
}