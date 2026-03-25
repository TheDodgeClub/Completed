import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row?.value ?? null;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export interface TicketEmailParams {
  toEmail: string;
  toName: string;
  eventName: string;
  eventDate: string | Date | null | undefined;
  eventLocation: string | null | undefined;
  ticketCode: string;
}

const DEFAULT_SUBJECT = "Your ticket is confirmed! 🎉";
const DEFAULT_FROM_NAME = "The Dodge Club";
const DEFAULT_FROM_EMAIL = "noreply@dodgeclub.com";
const DEFAULT_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0D0D0D; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 540px; margin: 40px auto; background: #151515; border-radius: 12px; overflow: hidden; }
    .header { background: #0B5E2F; padding: 32px 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; color: #FFD700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; color: rgba(255,255,255,0.7); font-size: 14px; }
    .body { padding: 32px; }
    .greeting { font-size: 17px; margin: 0 0 20px; }
    .ticket-box { background: #0B5E2F22; border: 1px solid #0B5E2F; border-radius: 10px; padding: 20px 24px; margin: 24px 0; }
    .ticket-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255,255,255,0.45); margin: 0 0 3px; }
    .ticket-box .value { font-size: 15px; color: #ffffff; margin: 0 0 14px; font-weight: 500; }
    .ticket-box .value:last-child { margin-bottom: 0; }
    .code-box { background: #0D0D0D; border: 1px dashed #FFD700; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0; }
    .code-box .code-label { font-size: 12px; color: rgba(255,255,255,0.5); letter-spacing: 0.8px; text-transform: uppercase; margin: 0 0 6px; }
    .code-box .code { font-family: 'Courier New', monospace; font-size: 22px; font-weight: bold; color: #FFD700; letter-spacing: 3px; }
    .footer { padding: 20px 32px; text-align: center; font-size: 12px; color: rgba(255,255,255,0.3); border-top: 1px solid #222; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>The Dodge Club</h1>
      <p>Your ticket is confirmed</p>
    </div>
    <div class="body">
      <p class="greeting">Hey {{userName}},</p>
      <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0 0 20px;">You're in! Here are your ticket details:</p>
      <div class="ticket-box">
        <p class="label">Event</p>
        <p class="value">{{eventName}}</p>
        <p class="label">Date</p>
        <p class="value">{{eventDate}}</p>
        <p class="label">Location</p>
        <p class="value">{{eventLocation}}</p>
      </div>
      <div class="code-box">
        <p class="code-label">Your Ticket Code</p>
        <p class="code">{{ticketCode}}</p>
      </div>
      <p style="font-size:13px;color:rgba(255,255,255,0.5);text-align:center;">Show this code at the door. See you on the court!</p>
    </div>
    <div class="footer">The Dodge Club &bull; This is an automated confirmation email</div>
  </div>
</body>
</html>
`;

export async function sendTicketConfirmationEmail(params: TicketEmailParams): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("[email] BREVO_API_KEY not set — skipping email");
    return;
  }

  const [fromName, fromEmail, subjectTpl, bodyHtml] = await Promise.all([
    getSetting("emailFromName"),
    getSetting("emailFromAddress"),
    getSetting("emailSubject"),
    getSetting("emailBodyHtml"),
  ]);

  const vars: Record<string, string> = {
    userName: params.toName,
    eventName: params.eventName,
    eventDate: formatDate(params.eventDate),
    eventLocation: params.eventLocation ?? "TBD",
    ticketCode: params.ticketCode,
  };

  const subject = interpolate(subjectTpl ?? DEFAULT_SUBJECT, vars);
  const html = interpolate(bodyHtml ?? DEFAULT_HTML, vars);

  const payload = {
    sender: { name: fromName ?? DEFAULT_FROM_NAME, email: fromEmail ?? DEFAULT_FROM_EMAIL },
    to: [{ email: params.toEmail, name: params.toName }],
    subject,
    htmlContent: html,
  };

  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Brevo API ${resp.status}: ${body}`);
  }

  console.log(`[email] Confirmation sent to ${params.toEmail} for event "${params.eventName}"`);
}
