import { PrismaClient } from "@prisma/client";
import ExcelJS          from "exceljs";
import nodemailer       from "nodemailer";

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || "smtp.gmail.com",
  port:   parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// ── Générer le fichier Excel pour un labo ───────────────────
async function buildExcel(labName: string, logins: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Connexions");
  const today = new Date();

  ws.mergeCells("A1:E1");
  const titleCell = ws.getCell("A1");
  titleCell.value     = `${labName} — Connexions du ${today.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}`;
  titleCell.font      = { bold: true, size: 13, color: { argb: "FFFFFF" } };
  titleCell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "064E3B" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 28;

  ws.addRow(["Nom", "Prénom", "Zone / Secteur", "Statut", "Heure de connexion"]);
  const headerRow = ws.getRow(2);
  headerRow.font      = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "065F46" } };
  headerRow.alignment = { horizontal: "center" };

  logins.forEach((l, i) => {
    const zone = l.user.delegate?.sector?.zoneResidence || l.user.delegate?.zone || "—";
    const row  = ws.addRow([
      l.user.lastName,
      l.user.firstName,
      zone,
      l.user.delegate?.status || "—",
      new Date(l.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    ]);
    if (i % 2 === 0)
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0FDF4" } };
  });

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 25;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 20;

  const totalRow = ws.addRow(["TOTAL", "", "", "", `${logins.length} connexion(s)`]);
  totalRow.font = { bold: true };
  totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D1FAE5" } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── HTML du mail ─────────────────────────────────────────────
function buildHtml(recipientName: string, labName: string, logins: any[], dateStr: string): string {
  const rows = logins.map((l) => {
    const zone = l.user.delegate?.sector?.zoneResidence || l.user.delegate?.zone || "—";
    const time = new Date(l.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${l.user.lastName} ${l.user.firstName}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${zone}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${time}</td>
      </tr>`;
  }).join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#064e3b,#059669);padding:24px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:20px">🏥 INOX PHARMA</h1>
        <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px">
          Rapport automatique — ${labName}
        </p>
      </div>
      <div style="background:#f0fdf4;padding:24px;border:1px solid #d1fae5">
        <p style="color:#374151;font-size:14px">Bonjour <strong>${recipientName}</strong>,</p>
        <p style="color:#374151;font-size:14px">
          Voici le rapport des connexions du <strong>${dateStr}</strong> pour le laboratoire <strong>${labName}</strong>.
        </p>
        <div style="background:white;border-radius:8px;padding:4px;margin:16px 0;border:1px solid #d1fae5">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#064e3b">
                <th style="padding:10px;color:white;text-align:left;border-radius:6px 0 0 0">Délégué</th>
                <th style="padding:10px;color:white;text-align:left">Zone</th>
                <th style="padding:10px;color:white;text-align:center;border-radius:0 6px 0 0">Heure</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p style="color:#6b7280;font-size:13px">
          Le fichier Excel joint contient le détail complet.
        </p>
      </div>
      <div style="background:#064e3b;padding:16px;border-radius:0 0 12px 12px;text-align:center">
        <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0">
          INOX PHARMA © ${new Date().getFullYear()} — Rapport automatique — Ne pas répondre
        </p>
      </div>
    </div>`;
}

// ── Fonction principale d'envoi ──────────────────────────────
export async function sendMorningConnectionReport() {
  try {
    const today      = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const dateStr = today.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

    // Récupérer la config + destinataires
    const config = await prisma.reportConfig.findFirst({
      where:   { isActive: true },
      include: {
        recipients: {
          include: {
            user: {
              select: {
                id: true, email: true, firstName: true, lastName: true,
                role: true,
                adminLabs: { include: { laboratory: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
    });

    if (!config) {
      console.log("⚠️ Aucune config rapport trouvée");
      return;
    }

    // Récupérer tous les laboratoires
    const laboratories = await prisma.laboratory.findMany({ select: { id: true, name: true } });

    // Récupérer toutes les connexions du jour avec info délégué + labo
    const allLogins = await prisma.loginHistory.findMany({
      where: {
        createdAt: { gte: startOfDay },
        success:   true,
        user:      { role: "DELEGATE" },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName:  true,
            role:      true,
            delegate:  {
              include: {
                sector:     true,
                laboratory: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Grouper les connexions par laboratoire
    const loginsByLab = new Map<string, { labName: string; logins: any[] }>();
    for (const lab of laboratories) {
      const labLogins = allLogins.filter((l) => l.user.delegate?.laboratory?.id === lab.id);
      loginsByLab.set(lab.id, { labName: lab.name, logins: labLogins });
    }

    // Récupérer le SUPER_ADMIN
    const superAdmin = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { email: true, firstName: true },
    });

    // ── Envoi aux destinataires configurés (ADMIN) ───────────
    for (const recipient of config.recipients) {
      const { user } = recipient;
      if (!user.email) continue;

      const userLabIds = user.adminLabs.map((al) => al.laboratory.id);

      // Construire un mail par laboratoire de l'admin
      for (const labId of userLabIds) {
        const labData = loginsByLab.get(labId);
        if (!labData || labData.logins.length === 0) continue;

        const excel = await buildExcel(labData.labName, labData.logins);

        await transporter.sendMail({
          from:    `"INOX PHARMA" <${process.env.SMTP_USER}>`,
          to:      user.email,
          subject: `📊 ${labData.labName} — Rapport connexions du ${dateStr}`,
          html:    buildHtml(`${user.firstName} ${user.lastName}`, labData.labName, labData.logins, dateStr),
          attachments: [{
            filename:    `connexions_${labData.labName}_${today.toISOString().slice(0, 10)}.xlsx`,
            content:     excel,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }],
        });
        console.log(`📧 Mail envoyé à ${user.email} — ${labData.labName} (${labData.logins.length} connexions)`);
      }
    }

    // ── Envoi au SUPER_ADMIN (tous les labos en un seul mail) ─
    if (superAdmin) {
      const allLabsWithLogins = Array.from(loginsByLab.values()).filter((l) => l.logins.length > 0);

      if (allLabsWithLogins.length > 0) {
        // Un Excel par labo en pièce jointe
        const attachments = await Promise.all(
          allLabsWithLogins.map(async (lab) => ({
            filename:    `connexions_${lab.labName}_${today.toISOString().slice(0, 10)}.xlsx`,
            content:     await buildExcel(lab.labName, lab.logins),
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }))
        );

        // HTML combiné tous labos
        const combinedHtml = allLabsWithLogins.map((lab) =>
          `<h3 style="color:#064e3b;margin-top:24px">🔬 ${lab.labName} — ${lab.logins.length} délégué(s)</h3>` +
          buildHtml("", lab.labName, lab.logins, dateStr)
            .replace(/<div style="font-family.*?<\/div>/s, "")
        ).join("");

        await transporter.sendMail({
          from:    `"INOX PHARMA" <${process.env.SMTP_USER}>`,
          to:      superAdmin.email,
          subject: `📊 INOX PHARMA — Rapport complet tous laboratoires du ${dateStr}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
              <div style="background:linear-gradient(135deg,#064e3b,#059669);padding:24px;border-radius:12px 12px 0 0">
                <h1 style="color:white;margin:0;font-size:20px">🏥 INOX PHARMA — Rapport Complet</h1>
                <p style="color:rgba(255,255,255,0.8);margin:6px 0 0">Tous les laboratoires — ${dateStr}</p>
              </div>
              <div style="background:#f0fdf4;padding:24px;border:1px solid #d1fae5">
                <p>Bonjour <strong>${superAdmin.firstName}</strong>,</p>
                <p>Résumé des connexions de tous les délégués aujourd'hui :</p>
                ${allLabsWithLogins.map((lab) => `
                  <div style="background:white;border-radius:8px;padding:16px;margin:12px 0;border:1px solid #d1fae5">
                    <h3 style="color:#064e3b;margin:0 0 12px">🔬 ${lab.labName}</h3>
                    <table style="width:100%;border-collapse:collapse">
                      <thead>
                        <tr style="background:#064e3b">
                          <th style="padding:8px;color:white;text-align:left">Délégué</th>
                          <th style="padding:8px;color:white;text-align:left">Zone</th>
                          <th style="padding:8px;color:white;text-align:center">Heure</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${lab.logins.map((l) => `
                          <tr>
                            <td style="padding:8px;border-bottom:1px solid #e5e7eb">${l.user.lastName} ${l.user.firstName}</td>
                            <td style="padding:8px;border-bottom:1px solid #e5e7eb">${l.user.delegate?.sector?.zoneResidence || l.user.delegate?.zone || "—"}</td>
                            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${new Date(l.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</td>
                          </tr>`).join("")}
                      </tbody>
                    </table>
                  </div>`).join("")}
              </div>
              <div style="background:#064e3b;padding:16px;border-radius:0 0 12px 12px;text-align:center">
                <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0">INOX PHARMA © ${today.getFullYear()} — Rapport automatique</p>
              </div>
            </div>`,
          attachments,
        });
        console.log(`📧 Mail SUPER_ADMIN envoyé à ${superAdmin.email} — ${allLabsWithLogins.length} laboratoire(s)`);
      }
    }

    console.log("✅ Rapport matin terminé");
  } catch (err) {
    console.error("❌ Erreur rapport matin:", err);
  }
}

// ── Scheduler dynamique ──────────────────────────────────────
let scheduleTimeout: ReturnType<typeof setTimeout> | null = null;

export async function scheduleMorningReport() {
  if (scheduleTimeout) clearTimeout(scheduleTimeout);

  // Lire l'heure depuis la base
  const config = await prisma.reportConfig.findFirst({ where: { isActive: true } });
  const hour   = config?.sendHour   ?? 9;
  const minute = config?.sendMinute ?? 30;

  const now  = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const ms = next.getTime() - now.getTime();
  const h  = Math.floor(ms / 3600000);
  const m  = Math.floor((ms % 3600000) / 60000);
  console.log(`📅 Prochain rapport dans ${h}h${m.toString().padStart(2, "0")} (${hour}h${minute.toString().padStart(2, "0")})`);

  scheduleTimeout = setTimeout(async () => {
    await sendMorningConnectionReport();
    scheduleMorningReport(); // Replanifier avec la nouvelle heure en base
  }, ms);
}