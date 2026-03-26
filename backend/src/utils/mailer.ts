import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || "smtp.gmail.com",
  port:   parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from:    `"INOX PHARMA" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email envoyé à ${to}`);
  } catch (err) {
    console.error("❌ Erreur email:", err);
  }
}

export function reportSubmittedEmail(
  adminName:  string,
  labName:    string,
  month:      string,
  year:       number,
  totalCA:    number,
  totalVentes:number
): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px;border-radius:12px">
      <div style="background:#0f172a;padding:20px;border-radius:8px;text-align:center;margin-bottom:20px">
        <h1 style="color:white;margin:0;font-size:22px">🏥 INOX PHARMA</h1>
        <p style="color:#94a3b8;margin:5px 0 0">Rapport des chiffres soumis</p>
      </div>
      <div style="background:white;padding:20px;border-radius:8px;margin-bottom:15px">
        <h2 style="color:#1e293b;font-size:16px;margin-top:0">Nouveau rapport disponible</h2>
        <p style="color:#475569">L'administrateur <strong>${adminName}</strong> a soumis le rapport des chiffres pour :</p>
        <ul style="color:#475569">
          <li><strong>Laboratoire :</strong> ${labName.toUpperCase()}</li>
          <li><strong>Période :</strong> ${month}/${year}</li>
          <li><strong>CA Total :</strong> ${totalCA.toLocaleString("fr-FR")} FCFA</li>
          <li><strong>Total Ventes :</strong> ${totalVentes.toLocaleString("fr-FR")} unités</li>
        </ul>
      </div>
      <div style="text-align:center;margin-top:20px">
        <a href="${process.env.FRONTEND_URL}/dashboard" 
           style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Voir le rapport
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:20px">
        INOX PHARMA — Côte d'Ivoire © ${new Date().getFullYear()}
      </p>
    </div>
  `;
}

export function alertInactiveDelegateEmail(
  delegateName: string,
  zone:         string,
  lastReportDate: string | null,
  daysSince:    number
): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px;border-radius:12px">
      <div style="background:#0f172a;padding:20px;border-radius:8px;text-align:center;margin-bottom:20px">
        <h1 style="color:white;margin:0;font-size:22px">🏥 INOX PHARMA</h1>
        <p style="color:#94a3b8;margin:5px 0 0">Alerte délégué inactif</p>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;padding:20px;border-radius:8px;margin-bottom:15px">
        <h2 style="color:#dc2626;font-size:16px;margin-top:0">⚠️ Délégué sans rapport depuis ${daysSince} jour(s)</h2>
        <p style="color:#475569">Le délégué <strong>${delegateName}</strong> de la zone <strong>${zone}</strong> n'a pas soumis de rapport depuis ${daysSince} jours.</p>
        ${lastReportDate
          ? `<p style="color:#475569">Dernier rapport : <strong>${lastReportDate}</strong></p>`
          : `<p style="color:#dc2626">Aucun rapport soumis pour ce délégué.</p>`
        }
      </div>
      <div style="text-align:center">
        <a href="${process.env.FRONTEND_URL}/dashboard"
           style="background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Voir le tableau de bord
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:20px">
        INOX PHARMA — Côte d'Ivoire © ${new Date().getFullYear()}
      </p>
    </div>
  `;
}