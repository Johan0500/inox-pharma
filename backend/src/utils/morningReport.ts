import { PrismaClient } from "@prisma/client";
import ExcelJS          from "exceljs";
import sgMail           from "@sendgrid/mail";

const prisma     = new PrismaClient();
const FROM_EMAIL = process.env.SMTP_FROM || "trevisjohan1@gmail.com";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// ── Excel ─────────────────────────────────────────────────────
async function generateExcel(labName: string, delegates: any[], date: Date): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Connexions");

  ws.mergeCells("A1:F1");
  const title = ws.getCell("A1");
  title.value     = `INOX PHARMA — ${labName.toUpperCase()} — ${date.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })}`;
  title.font      = { bold:true, size:13, color:{ argb:"FFFFFF" } };
  title.fill      = { type:"pattern", pattern:"solid", fgColor:{ argb:"064E3B" } };
  title.alignment = { horizontal:"center", vertical:"middle" };
  ws.getRow(1).height = 30;

  ws.mergeCells("A2:F2");
  const sub = ws.getCell("A2");
  sub.value     = `${delegates.filter(d => d.connected).length} connecté(s) sur ${delegates.length}`;
  sub.fill      = { type:"pattern", pattern:"solid", fgColor:{ argb:"D1FAE5" } };
  sub.alignment = { horizontal:"center" };

  const hRow = ws.addRow(["Nom", "Prénom", "Zone", "Secteur", "Heure connexion", "Statut"]);
  hRow.font = { bold:true, color:{ argb:"FFFFFF" } };
  hRow.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"065F46" } };

  delegates.forEach((d, i) => {
    const row = ws.addRow([
      d.lastName, d.firstName, d.zone || "—", d.sector || "—",
      d.loginTime || "Non connecté",
      d.connected ? "✅ Connecté" : "❌ Absent",
    ]);
    row.fill = { type:"pattern", pattern:"solid",
      fgColor:{ argb: d.connected ? (i%2===0 ? "F0FDF4" : "FFFFFF") : (i%2===0 ? "FFF1F2" : "FFFFFF") } };
    row.getCell(6).font = { bold:true, color:{ argb: d.connected ? "166534" : "9F1239" } };
  });

  ws.columns = [{ width:20 }, { width:20 }, { width:22 }, { width:22 }, { width:18 }, { width:16 }];
  ws.addRow([]);
  const sumRow = ws.addRow(["RÉSUMÉ", "", "",
    `Connectés: ${delegates.filter(d => d.connected).length}`,
    `Absents: ${delegates.filter(d => !d.connected).length}`,
    `Total: ${delegates.length}`]);
  sumRow.eachCell(c => {
    c.font = { bold:true, color:{ argb:"FFFFFF" } };
    c.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"064E3B" } };
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── HTML email admin ──────────────────────────────────────────
function generateHtml(name: string, labName: string, delegates: any[], date: Date): string {
  const connected = delegates.filter(d => d.connected);
  const absent    = delegates.filter(d => !d.connected);
  const dateStr   = date.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });

  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#064e3b,#059669);padding:28px;border-radius:12px 12px 0 0;text-align:center">
      <div style="font-size:36px">🏥</div>
      <h1 style="color:white;margin:8px 0 0;font-size:20px;letter-spacing:2px">INOX PHARMA</h1>
      <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px">Rapport automatique des connexions</p>
    </div>
    <div style="background:white;padding:28px;border:1px solid #e5e7eb">
      <p style="color:#374151">Bonjour <strong>${name}</strong>,</p>
      <p style="color:#6b7280;font-size:14px">Rapport <strong>${labName.toUpperCase()}</strong> — ${dateStr}</p>
      <div style="display:flex;gap:12px;margin:20px 0">
        <div style="flex:1;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:32px;font-weight:bold;color:#064e3b">${connected.length}</div>
          <div style="font-size:12px;color:#6b7280">Connecté(s)</div>
        </div>
        <div style="flex:1;background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:32px;font-weight:bold;color:#9f1239">${absent.length}</div>
          <div style="font-size:12px;color:#6b7280">Absent(s)</div>
        </div>
        <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:32px;font-weight:bold;color:#1e293b">${delegates.length}</div>
          <div style="font-size:12px;color:#6b7280">Total</div>
        </div>
      </div>
      ${connected.length > 0 ? `
      <h3 style="color:#064e3b;font-size:14px;border-bottom:2px solid #d1fae5;padding-bottom:8px">
        ✅ Délégués connectés (${connected.length})
      </h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
        <thead><tr style="background:#064e3b">
          <th style="padding:10px;color:white;text-align:left">Nom</th>
          <th style="padding:10px;color:white;text-align:left">Zone</th>
          <th style="padding:10px;color:white;text-align:center">Heure</th>
        </tr></thead>
        <tbody>${connected.map((d, i) => `
          <tr style="background:${i%2===0 ? "#f0fdf4" : "white"};border-bottom:1px solid #d1fae5">
            <td style="padding:10px;font-weight:600">${d.lastName} ${d.firstName}</td>
            <td style="padding:10px;color:#6b7280">${d.zone || "—"}</td>
            <td style="padding:10px;text-align:center;font-weight:700;color:#059669">${d.loginTime}</td>
          </tr>`).join("")}
        </tbody>
      </table>` : ""}
      ${absent.length > 0 ? `
      <h3 style="color:#9f1239;font-size:14px;border-bottom:2px solid #fecdd3;padding-bottom:8px">
        ❌ Non connectés (${absent.length})
      </h3>
      <p style="color:#9f1239;font-size:13px">${absent.map(d => `${d.firstName} ${d.lastName}`).join(", ")}</p>` : ""}
      <p style="color:#9ca3af;font-size:12px;margin-top:20px">📎 Fichier Excel joint avec détail complet.</p>
    </div>
    <div style="background:#064e3b;padding:16px;border-radius:0 0 12px 12px;text-align:center">
      <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0">
        INOX PHARMA © ${date.getFullYear()} — Email automatique
      </p>
    </div>
  </div>`;
}

// ── Envoi SendGrid ─────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string, attachments: any[]) {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("❌ SENDGRID_API_KEY manquant");
    return;
  }
  await sgMail.send({
    to,
    from:    { email: FROM_EMAIL, name: "INOX PHARMA" },
    subject,
    html,
    attachments: attachments.map(a => ({
      filename:    a.filename,
      content:     a.content.toString("base64"),
      type:        a.type,
      disposition: "attachment",
    })),
  });
}

// ── Données délégués par labo ──────────────────────────────────
async function getDelegatesData(laboratoryId: string, startOfDay: Date) {
  const lab = await prisma.laboratory.findUnique({
    where:   { id: laboratoryId },
    include: {
      delegates: {
        include: {
          user:   { select: { id:true, firstName:true, lastName:true } },
          sector: { select: { zoneResidence:true } },
        },
      },
    },
  });
  if (!lab) return [];

  return Promise.all(lab.delegates.map(async (d) => {
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
      loginTime: login
        ? login.createdAt.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })
        : null,
    };
  }));
}

// ── Fonction principale ────────────────────────────────────────
export async function sendMorningConnectionReport() {
  try {
    const today      = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    console.log(`📧 Rapport matin du ${today.toLocaleDateString("fr-FR")}...`);

    const dateStr = today.toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" });

    // ── Récupérer tous les labos et leurs données ────────────
    const allLabs = await prisma.laboratory.findMany();
    const labsData: Record<string, { labName: string; labId: string; delegates: any[] }> = {};

    for (const lab of allLabs) {
      const delegates = await getDelegatesData(lab.id, startOfDay);
      labsData[lab.id] = { labName: lab.name, labId: lab.id, delegates };
      console.log(`  📊 ${lab.name}: ${delegates.filter(d => d.connected).length}/${delegates.length} connectés`);
    }

    // ── Récupérer TOUS les admins actifs automatiquement ─────
    const allAdmins = await prisma.user.findMany({
      where:    { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
      include:  { adminLabs: { include: { laboratory: true } } },
    });

    console.log(`📋 ${allAdmins.length} admin(s) actif(s) trouvé(s)`);

    for (const u of allAdmins) {
      console.log(`  📤 Envoi à ${u.email} (${u.role})...`);

      try {
        if (u.role === "SUPER_ADMIN") {
          // ── Super Admin → tous les labos en un seul email ──
          const attachments: any[] = [];
          let globalHtml = "";
          let totalConn  = 0;
          let totalAll   = 0;

          for (const [, data] of Object.entries(labsData)) {
            const conn = data.delegates.filter(d => d.connected).length;
            totalConn += conn;
            totalAll  += data.delegates.length;

            const excel = await generateExcel(data.labName, data.delegates, today);
            attachments.push({
              filename: `${data.labName}_${today.toISOString().slice(0, 10)}.xlsx`,
              content:  excel,
              type:     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            globalHtml += `
              <div style="margin-bottom:20px;border:1px solid #d1fae5;border-radius:10px;overflow:hidden">
                <div style="background:#065f46;padding:12px 16px">
                  <h3 style="color:white;margin:0;font-size:14px">
                    🔬 ${data.labName.toUpperCase()} — ${conn}/${data.delegates.length} connecté(s)
                  </h3>
                </div>
                <div style="padding:12px 16px;background:white">
                  ${data.delegates.filter(d => d.connected).length > 0
                    ? data.delegates.filter(d => d.connected).map(d => `
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0fdf4;font-size:13px">
                          <span style="font-weight:600">${d.lastName} ${d.firstName}</span>
                          <span style="color:#6b7280">${d.zone || "—"}</span>
                          <span style="color:#059669;font-weight:700">${d.loginTime}</span>
                        </div>`).join("")
                    : `<p style="color:#6b7280;font-size:13px;margin:8px 0">Aucun délégué connecté</p>`
                  }
                  ${data.delegates.filter(d => !d.connected).length > 0
                    ? `<p style="color:#9f1239;font-size:12px;margin:8px 0 0">
                        Absents: ${data.delegates.filter(d => !d.connected).map(d => `${d.firstName} ${d.lastName}`).join(", ")}
                      </p>`
                    : data.delegates.length > 0
                      ? `<p style="color:#059669;font-size:12px;margin:8px 0 0">✅ Tous connectés</p>`
                      : ""
                  }
                </div>
              </div>`;
          }

          const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#064e3b,#059669);padding:28px;border-radius:12px 12px 0 0;text-align:center">
              <div style="font-size:36px">🏥</div>
              <h1 style="color:white;margin:8px 0 0;font-size:20px;letter-spacing:2px">INOX PHARMA</h1>
              <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px">
                Rapport Super Admin — ${dateStr}
              </p>
            </div>
            <div style="background:white;padding:28px;border:1px solid #e5e7eb">
              <p style="color:#374151">Bonjour <strong>${u.firstName}</strong>,</p>
              <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;text-align:center;margin:16px 0">
                <div style="font-size:36px;font-weight:bold;color:#064e3b">${totalConn} / ${totalAll}</div>
                <div style="color:#6b7280;font-size:13px">délégués connectés (tous laboratoires)</div>
              </div>
              ${globalHtml}
              <p style="color:#9ca3af;font-size:12px">📎 ${attachments.length} fichier(s) Excel joint(s).</p>
            </div>
            <div style="background:#064e3b;padding:16px;border-radius:0 0 12px 12px;text-align:center">
              <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0">
                INOX PHARMA © ${today.getFullYear()}
              </p>
            </div>
          </div>`;

          await sendEmail(
            u.email,
            `📊 INOX PHARMA — Rapport global ${dateStr} (${totalConn}/${totalAll} délégués)`,
            html,
            attachments,
          );
          console.log(`  ✅ Email Super Admin → ${u.email}`);

        } else if (u.role === "ADMIN") {
          // ── Admin → seulement ses labos ───────────────────
          const adminLabIds = u.adminLabs.map((al: any) => al.laboratoryId);

          if (adminLabIds.length === 0) {
            console.log(`  ⚠️ ${u.email} n'a aucun laboratoire assigné — ignoré`);
            continue;
          }

          for (const labId of adminLabIds) {
            const data = labsData[labId];
            if (!data) continue;

            const excel = await generateExcel(data.labName, data.delegates, today);
            await sendEmail(
              u.email,
              `📊 INOX PHARMA — ${data.labName.toUpperCase()} — ${dateStr}`,
              generateHtml(u.firstName, data.labName, data.delegates, today),
              [{
                filename: `${data.labName}_${today.toISOString().slice(0, 10)}.xlsx`,
                content:  excel,
                type:     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              }],
            );
            console.log(`  ✅ Email Admin → ${u.email} (${data.labName})`);
          }
        }
      } catch (emailErr: any) {
        console.error(
          `  ❌ Échec ${u.email}:`,
          emailErr?.response?.body?.errors || emailErr?.message || emailErr,
        );
      }
    }

    console.log("🎉 Rapport matin terminé !");
  } catch (err) {
    console.error("❌ Erreur rapport matin:", err);
  }
}

// ── Planificateur ──────────────────────────────────────────────
export function scheduleMorningReport() {
  async function scheduleNext() {
    try {
      const schedule = await prisma.emailSchedule.findFirst({ where: { isActive: true } });
      const hour   = schedule?.hour   ?? 9;
      const minute = schedule?.minute ?? 30;

      const now  = new Date();
      const next = new Date();
      next.setHours(hour, minute, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);

      const ms = next.getTime() - now.getTime();
      const h  = Math.floor(ms / 3600000);
      const m  = Math.floor((ms % 3600000) / 60000);
      console.log(`📅 Prochain email automatique à ${hour}h${String(minute).padStart(2, "0")} (dans ${h}h${String(m).padStart(2, "0")})`);

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