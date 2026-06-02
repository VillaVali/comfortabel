import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Sender address — uses env var RESEND_FROM if set, otherwise falls back to Resend's test sender
const FROM = process.env.RESEND_FROM || "MijnComfortabel <onboarding@resend.dev>";

// ── Generic send helper ────────────────────────────────────────────────────────
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] Unexpected error:", msg);
    return { success: false, error: msg };
  }
}

// ── Shared HTML wrapper ────────────────────────────────────────────────────────
function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MijnComfortabel</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1E3A5F;padding:24px 36px;">
              <img src="https://mijncomfort-a8mtknzo.manus.space/manus-storage/comfortabel-logo_8c90d4c3.png" alt="Comfortabel" style="height:36px;width:auto;display:block;filter:brightness(0) invert(1);" />
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:12px;">Grip op uw woning. Rust in uw hoofd.</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:11px;">
                © ${new Date().getFullYear()} Comfortabel® — Villa Vali Bouwgroep<br/>
                <a href="https://mijncomfort-a8mtknzo.manus.space/privacy" style="color:#94a3b8;">Privacyverklaring</a>
                &nbsp;·&nbsp;
                <a href="https://mijncomfort-a8mtknzo.manus.space/algemene-voorwaarden" style="color:#94a3b8;">Algemene Voorwaarden</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Template: wachtwoord reset ─────────────────────────────────────────────────
export function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1E3A5F;font-size:22px;font-weight:700;">Wachtwoord opnieuw instellen</h2>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      Hallo ${name},<br/><br/>
      U heeft een verzoek ingediend om uw wachtwoord opnieuw in te stellen.
      Klik op de knop hieronder om een nieuw wachtwoord te kiezen.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:#C9A84C;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
        Wachtwoord opnieuw instellen
      </a>
    </div>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
      Deze link is 1 uur geldig. Als u geen verzoek heeft ingediend, kunt u deze e-mail negeren.
      Uw wachtwoord blijft dan ongewijzigd.
    </p>
  `);

  return sendEmail({
    to,
    subject: "Wachtwoord opnieuw instellen — MijnComfortabel",
    html,
    text: `Hallo ${name},\n\nKlik op de volgende link om uw wachtwoord opnieuw in te stellen:\n${resetUrl}\n\nDeze link is 1 uur geldig.\n\nMijnComfortabel`,
  });
}

// ── Template: klant portaal uitnodiging ────────────────────────────────────────
export function sendInvitationEmail({
  to,
  name,
  inviteUrl,
  propertyAddress,
  invitedBy,
}: {
  to: string;
  name: string;
  inviteUrl: string;
  propertyAddress?: string;
  invitedBy?: string;
}) {
  const propertyLine = propertyAddress
    ? `<p style="margin:0 0 16px;color:#475569;font-size:14px;">Uw woning: <strong>${propertyAddress}</strong></p>`
    : "";

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1E3A5F;font-size:22px;font-weight:700;">Welkom bij MijnComfortabel</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      Hallo ${name},<br/><br/>
      ${invitedBy ? `${invitedBy} heeft` : "U bent"} uitgenodigd voor het MijnComfortabel portaal — uw persoonlijk woningdossier.
    </p>
    ${propertyLine}
    <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
      Via het portaal heeft u toegang tot uw Woningpaspoort™, onderhoudspunten, documenten en de AI Huismeester.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${inviteUrl}" style="display:inline-block;background:#1E3A5F;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
        Toegang tot mijn portaal
      </a>
    </div>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
      Als u geen account heeft, kunt u zich gratis registreren via de knop hierboven.
      Heeft u vragen? Neem contact op via <a href="mailto:info@comfortabel.nl" style="color:#1E3A5F;">info@comfortabel.nl</a>.
    </p>
  `);

  return sendEmail({
    to,
    subject: "Uw uitnodiging voor MijnComfortabel",
    html,
    text: `Hallo ${name},\n\nU bent uitgenodigd voor het MijnComfortabel portaal.\n\nKlik op de volgende link om toegang te krijgen:\n${inviteUrl}\n\nMijnComfortabel`,
  });
}

// ── Template: rapport gereed ───────────────────────────────────────────────────
export function sendReportReadyEmail({
  to,
  name,
  reportType,
  propertyAddress,
  downloadUrl,
}: {
  to: string;
  name: string;
  reportType: string;
  propertyAddress: string;
  downloadUrl: string;
}) {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1E3A5F;font-size:22px;font-weight:700;">Uw rapport is klaar</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      Hallo ${name},<br/><br/>
      Uw <strong>${reportType}</strong> voor <strong>${propertyAddress}</strong> is gereed en klaar om te downloaden.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${downloadUrl}" style="display:inline-block;background:#C9A84C;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
        Rapport downloaden
      </a>
    </div>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
      U kunt het rapport ook altijd terugvinden in uw portaal onder het tabblad Downloads.
    </p>
  `);

  return sendEmail({
    to,
    subject: `Uw ${reportType} is klaar — MijnComfortabel`,
    html,
    text: `Hallo ${name},\n\nUw ${reportType} voor ${propertyAddress} is klaar.\n\nDownload via: ${downloadUrl}\n\nMijnComfortabel`,
  });
}

// ── Template: welkomstmail nieuwe gebruiker ────────────────────────────────────
export function sendWelcomeEmail({
  to,
  name,
  loginUrl,
}: {
  to: string;
  name: string;
  loginUrl: string;
}) {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1E3A5F;font-size:22px;font-weight:700;">Welkom bij MijnComfortabel!</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      Hallo ${name},<br/><br/>
      Uw account is succesvol aangemaakt. U kunt nu inloggen op uw persoonlijk woningportaal.
    </p>
    <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
      Via het portaal heeft u toegang tot uw Woningpaspoort™, onderhoudspunten, documenten en de AI Huismeester.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${loginUrl}" style="display:inline-block;background:#1E3A5F;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
        Naar mijn portaal
      </a>
    </div>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
      Heeft u vragen? Neem contact op via <a href="mailto:info@comfortabel.nl" style="color:#1E3A5F;">info@comfortabel.nl</a>.
    </p>
  `);

  return sendEmail({
    to,
    subject: "Welkom bij MijnComfortabel — uw portaal is klaar",
    html,
    text: `Hallo ${name},\n\nUw account is aangemaakt. Log in via:\n${loginUrl}\n\nMijnComfortabel`,
  });
}

// ── Template: admin notificatie nieuwe registratie ─────────────────────────────
export function sendAdminNewUserEmail({
  adminEmail,
  userName,
  userEmail,
  registeredAt,
}: {
  adminEmail: string;
  userName: string;
  userEmail: string;
  registeredAt: string;
}) {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1E3A5F;font-size:22px;font-weight:700;">Nieuwe registratie</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      Er heeft zich een nieuwe gebruiker aangemeld op MijnComfortabel.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
      <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;width:120px;">Naam</td><td style="padding:8px 0;color:#1E3A5F;font-size:14px;font-weight:600;">${userName}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;">E-mail</td><td style="padding:8px 0;color:#1E3A5F;font-size:14px;">${userEmail}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;">Tijdstip</td><td style="padding:8px 0;color:#475569;font-size:13px;">${registeredAt}</td></tr>
    </table>
    <p style="margin:0 0 0;color:#94a3b8;font-size:12px;">
      Beheer gebruikers via het admin dashboard.
    </p>
  `);

  return sendEmail({
    to: adminEmail,
    subject: `Nieuwe registratie: ${userName} — MijnComfortabel`,
    html,
    text: `Nieuwe registratie:\nNaam: ${userName}\nE-mail: ${userEmail}\nTijdstip: ${registeredAt}\n\nMijnComfortabel`,
  });
}
