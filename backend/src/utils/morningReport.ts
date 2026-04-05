import { PrismaClient } from "@prisma/client";
import ExcelJS          from "exceljs";
import nodemailer       from "nodemailer";

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || "smtp.gmail.com",
  port:   465,
  secure: true,
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// ── Générer le fichier Excel pour un labo ────────────────────
async function generateExcel(
  labName:   string,
  delegates: any[],
  date:      Date
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Connexions");

  // Titre
  ws.mergeCells("A1:F1");
  const title = ws.getCell("A1");
  title.value     = `INOX PHARMA — ${labName.toUpperCase()} — Connexions du ${date.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })}`;
  title.font      = { bold:true, size:13, color:{ argb:"FFFFFF" } };
  title.fill      = { type:"pattern", pattern:"solid", fgColor:{ argb:"064E3B" } };
  title.alignment = { horizontal:"center", vertical:"middle" };
  ws.getRow(1).height = 30;

  // Sous-titre
  ws.mergeCells("A2:F2");
  const sub = ws.getCell("A2");
  sub.value     = `${delegates.filter(d => d.connected).length} délégué(s) connecté(s) sur ${delegates.length} au total`;
  sub.font      = { size:11, color:{ argb:"064E3B" } };
  sub.fill      = { type:"pattern", pattern:"solid", fgColor:{ argb:"D1FAE5" } };
  sub.alignment = { horizontal:"center" };
  ws.getRow(2).height = 22;

  // En-têtes colonnes
  const headerRow = ws.addRow(["Nom", "Prénom", "Zone", "Secteur", "Heure connexion", "Statut"]);
  headerRow.font      = { bold:true, color:{ argb:"FFFFFF" } };
  headerRow.fill      = { type:"pattern", pattern:"solid", fgColor:{ argb:"065F46" } };
  headerRow.alignment = { horizontal:"center" };
  ws.getRow(3).height = 20;

  // Données
  delegates.forEach((d, i) => {
    const row = ws.addRow([
      d.lastName,
      d.firstName,
      d.zone || "—",
      d.sector || "—",
      d.loginTime || "Non connecté",
      d.connected ? "✅ Connecté" : "❌ Absent",
    ]);

    row.fill = {
      type:"pattern", pattern:"solid",
      fgColor:{ argb: d.connected ? (i%2===0 ? "F0FDF4" : "FFFFFF") : (i%2===0 ? "FFF1F2" : "FFFFFF") },
    };

    // Colorier la colonne statut
    const statusCell = row.getCell(6);
    statusCell.font = { bold:true, color:{ argb: d.connected ? "166534" : "9F1239" } };
  });

  // Largeurs
  ws.columns = [
    { width:20 }, { width:20 }, { width:22 },
    { width:22 }, { width:18 }, { width:16 },
  ];

  // Ligne résumé
  ws.addRow([]);
  const summaryRow = ws.addRow([
    "RÉSUMÉ", "", "",
    `Connectés : ${delegates.filter(d=>d.connected).length}`,
    `Absents : ${delegates.filter(d=>!d.connected).length}`,
    `Total : ${delegates.length}`,
  ]);
  summaryRow.font = { bold:true };
  summaryRow.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"064E3B" } };
  summaryRow.eachCell(cell => { cell.font = { bold:true, color:{ argb:"FFFFFF" } }; });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ── Générer le HTML de l'email ───────────────────────────────
function generateEmailHtml(
  recipientName: string,
  labName:       string,
  delegates:     any[],
  date:          Date
): string {
  const connected = delegates.filter(d => d.connected);
  const absent    = delegates.filter(d => !d.connected);
  const dateStr   = date.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });

  const delegateRows = connected.map(d => `
    <tr style="border-bottom:1px solid #d1fae5">
      <td style="padding:10px 12px;font-weight:600;color:#111827">${d.lastName} ${d.firstName}</td>
      <td style="padding:10px 12px;color:#6b7280">${d.zone || "—"}</td>
      <td style="padding:10px 12px;color:#6b7280">${d.sector || "—"}</td>
      <td style="padding:10px 12px;text-align:center;font-weight:700;color:#059669">${d.loginTime || "—"}</td>
    </tr>
  `).join("");

  const absentRows = absent.length > 0 ? absent.map(d => `
    <tr style="border-bottom:1px solid #fee2e2">
      <td style="padding:8px 12px;color:#9f1239">${d.lastName} ${d.firstName}</td>
      <td style="padding:8px 12px;color:#9f1239">${d.zone || "—"}</td>
      <td colspan="2" style="padding:8px 12px;color:#ef4444;text-align:center">Non connecté</td>
    </tr>
  `).join("") : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#f9fafb">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#064e3b,#059669);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-size:32px;margin-bottom:8px">🏥</div>
        <h1 style="color:white;margin:0;font-size:22px;letter-spacing:2px">INOX PHARMA</h1>
        <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px">Rapport automatique des connexions</p>
      </div>

      <!-- Corps -->
      <div style="background:white;padding:28px 24px;border:1px solid #e5e7eb">
        <p style="color:#374151;font-size:15px;margin:0 0 6px">Bonjour <strong>${recipientName}</strong>,</p>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px">
          Voici le rapport des connexions pour le laboratoire <strong style="color:#064e3b">${labName.toUpperCase()}</strong> — ${dateStr}.
        </p>

        <!-- KPIs -->
        <div style="display:flex;gap:12px;margin-bottom:24px">
          <div style="flex:1;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:bold;color:#064e3b">${connected.length}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">Connecté(s)</div>
          </div>
          <div style="flex:1;background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:bold;color:#9f1239">${absent.length}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">Absent(s)</div>
          </div>
          <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:bold;color:#1e293b">${delegates.length}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">Total délégués</div>
          </div>
        </div>

        ${connected.length > 0 ? `
        <!-- Tableau connectés -->
        <h3 style="color:#064e3b;font-size:14px;margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid #d1fae5">
          ✅ Délégués connectés (${connected.length})
        </h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
          <thead>
            <tr style="background:#064e3b">
              <th style="padding:10px 12px;color:white;text-align:left;font-weight:600">Nom</th>
              <th style="padding:10px 12px;color:white;text-align:left;font-weight:600">Zone</th>
              <th style="padding:10px 12px;color:white;text-align:left;font-weight:600">Secteur</th>
              <th style="padding:10px 12px;color:white;text-align:center;font-weight:600">Heure</th>
            </tr>
          </thead>
          <tbody>${delegateRows}</tbody>
        </table>` : ""}

        ${absent.length > 0 ? `
        <!-- Tableau absents -->
        <h3 style="color:#9f1239;font-size:14px;margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid #fecdd3">
          ❌ Délégués non connectés (${absent.length})
        </h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
          <thead>
            <tr style="background:#9f1239">
              <th style="padding:8px 12px;color:white;text-align:left">Nom</th>
              <th style="padding:8px 12px;color:white;text-align:left">Zone</th>
              <th colspan="2" style="padding:8px 12px;color:white;text-align:center">Statut</th>
            </tr>
          </thead>
          <tbody>${absentRows}</tbody>
        </table>` : ""}

        <p style="color:#9ca3af;font-size:12px;margin:16px 0 0">
          📎 Le fichier Excel joint contient le détail complet de ce rapport.
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#064e3b;padding:16px;border-radius:0 0 12px 12px;text-align:center">
        <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0">
          INOX PHARMA © ${date.getFullYear()} — Email automatique — Ne pas répondre
        </p>
      </div>
    </div>
  `;
}

// ── Fonction principale d'envoi ──────────────────────────────
export async function sendMorningConnectionReport() {
  try {
    const today      = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    console.log(`📧 Génération rapport matin du ${today.toLocaleDateString("fr-FR")}...`);

    // Récupérer la config depuis la base
    const schedule = await prisma.emailSchedule.findFirst({
      where:   { isActive: true },
      include: { recipients: { include: { user: { select: { id:true, email:true, firstName:true, lastName:true, role:true, adminLabs:{ include:{ laboratory:true } } } } } } },
    });

    if (!schedule) {
      console.log("⚠️ Aucune configuration d'email trouvée");
      return;
    }

    // Récupérer les 2 laboratoires
    const labs = await prisma.laboratory.findMany({
      include: {
        delegates: {
          include: {
            user:   { select: { firstName:true, lastName:true } },
            sector: { select: { zoneResidence:true } },
          },
        },
      },
    });

    // Pour chaque labo, calculer les connexions du jour
    const labsData: Record<string, any> = {};
    for (const lab of labs) {
      const delegatesData = await Promise.all(lab.delegates.map(async (d) => {
        const login = await prisma.loginHistory.findFirst({
          where:   { userId: d.userId, success: true, createdAt: { gte: startOfDay } },
          orderBy: { createdAt: "asc" },
        });
        return {
          lastName:  d.user.lastName,
          firstName: d.user.firstName,
          zone:      d.zone,
          sector:    d.sector?.zoneResidence || null,
          connected: !!login,
          loginTime: login ? login.createdAt.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" }) : null,
        };
      }));
      labsData[lab.name] = { lab, delegates: delegatesData };
    }

    // Envoyer les emails aux destinataires configurés
    for (const recipient of schedule.recipients) {
      const u = recipient.user;

      if (u.role === "SUPER_ADMIN") {
        // Super Admin reçoit TOUS les labos en un seul email
        let allDelegatesHtml = "";
        const allAttachments = [];

        for (const [labName, data] of Object.entries(labsData)) {
          const connected = data.delegates.filter((d: any) => d.connected).length;
          allDelegatesHtml += `
            <div style="margin-bottom:24px">
              <h3 style="color:#064e3b;background:#d1fae5;padding:10px 14px;border-radius:8px;margin:0 0 12px;font-size:14px">
                🔬 ${labName.toUpperCase()} — ${connected}/${data.delegates.length} connecté(s)
              </h3>
              ${data.delegates.filter((d: any) => d.connected).map((d: any) => `
                <div style="display:flex;justify-content:space-between;padding:8px 12px;background:#f9fafb;border-radius:6px;margin-bottom:4px;font-size:13px">
                  <span style="font-weight:600">${d.lastName} ${d.firstName}</span>
                  <span style="color:#6b7280">${d.zone || "—"}</span>
                  <span style="color:#059669;font-weight:700">${d.loginTime}</span>
                </div>
              `).join("")}
              ${data.delegates.filter((d: any) => !d.connected).length > 0 ? `
                <p style="color:#9f1239;font-size:12px;margin:8px 0 0">
                  ${data.delegates.filter((d: any) => !d.connected).length} absent(s) : ${data.delegates.filter((d: any) => !d.connected).map((d: any) => `${d.firstName} ${d.lastName}`).join(", ")}
                </p>
              ` : ""}
            </div>
          `;

          // Fichier Excel par labo
          const excelBuffer = await generateExcel(labName, data.delegates, today);
          allAttachments.push({
            filename:    `${labName}_connexions_${today.toISOString().slice(0,10)}.xlsx`,
            content:     excelBuffer,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
        }

        const totalConnected = Object.values(labsData).reduce((a: number, d: any) => a + d.delegates.filter((x: any) => x.connected).length, 0);
        const totalAll       = Object.values(labsData).reduce((a: number, d: any) => a + d.delegates.length, 0);

        await transporter.sendMail({
          from:    `"INOX PHARMA" <${process.env.SMTP_USER}>`,
          to:      u.email,
          subject: `📊 INOX PHARMA — Rapport global connexions ${today.toLocaleDateString("fr-FR")} (${totalConnected}/${totalAll} délégués)`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto">
              <div style="background:linear-gradient(135deg,#064e3b,#059669);padding:28px;border-radius:12px 12px 0 0;text-align:center">
                <div style="font-size:32px;margin-bottom:8px">🏥</div>
                <h1 style="color:white;margin:0;font-size:22px;letter-spacing:2px">INOX PHARMA</h1>
                <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px">Rapport global — Super Administrateur</p>
              </div>
              <div style="background:white;padding:28px;border:1px solid #e5e7eb">
                <p style="color:#374151">Bonjour <strong>${u.firstName}</strong>,</p>
                <p style="color:#6b7280;font-size:14px">Rapport du <strong>${today.toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</strong></p>
                <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;text-align:center;margin:16px 0">
                  <div style="font-size:32px;font-weight:bold;color:#064e3b">${totalConnected} / ${totalAll}</div>
                  <div style="font-size:13px;color:#6b7280">délégués connectés ce matin</div>
                </div>
                ${allDelegatesHtml}
              </div>
              <div style="background:#064e3b;padding:16px;border-radius:0 0 12px 12px;text-align:center">
                <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0">INOX PHARMA © ${today.getFullYear()} — Email automatique</p>
              </div>
            </div>
          `,
          attachments: allAttachments,
        });
        console.log(`✅ Email Super Admin envoyé à ${u.email}`);

      } else if (u.role === "ADMIN") {
        // Admin reçoit seulement son labo
        const adminLabNames = u.adminLabs.map((al: any) => al.laboratory.name);

        for (const labName of adminLabNames) {
          const data = labsData[labName];
          if (!data) continue;

          const excelBuffer = await generateExcel(labName, data.delegates, today);

          await transporter.sendMail({
            from:    `"INOX PHARMA" <${process.env.SMTP_USER}>`,
            to:      u.email,
            subject: `📊 INOX PHARMA — ${labName.toUpperCase()} — Connexions du ${today.toLocaleDateString("fr-FR")}`,
            html:    generateEmailHtml(u.firstName, labName, data.delegates, today),
            attachments: [{
              filename:    `${labName}_connexions_${today.toISOString().slice(0,10)}.xlsx`,
              content:     excelBuffer,
              contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }],
          });
          console.log(`✅ Email Admin envoyé à ${u.email} pour ${labName}`);
        }
      }
    }

    console.log(`🎉 Rapport matin terminé — ${schedule.recipients.length} destinataire(s)`);
  } catch (err) {
    console.error("❌ Erreur rapport matin:", err);
  }
}

// ── Planificateur automatique ────────────────────────────────
export function scheduleMorningReport() {
  async function scheduleNext() {
    try {
      // Récupérer l'heure configurée en base
      const schedule = await prisma.emailSchedule.findFirst({
        where: { isActive: true },
      });

      const hour   = schedule?.hour   ?? 9;
      const minute = schedule?.minute ?? 30;

      const now  = new Date();
      const next = new Date();
      next.setHours(hour, minute, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);

      const ms = next.getTime() - now.getTime();
      const h  = Math.floor(ms / 3600000);
      const m  = Math.floor((ms % 3600000) / 60000);

      console.log(`📅 Prochain email automatique à ${hour}h${minute.toString().padStart(2,"0")} (dans ${h}h${m.toString().padStart(2,"0")})`);

      setTimeout(async () => {
        await sendMorningConnectionReport();
        scheduleNext();
      }, ms);
    } catch (err) {
      console.error("Erreur planification:", err);
      setTimeout(scheduleNext, 60 * 60 * 1000);
    }
  }

  scheduleNext();
}