import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row?.value ?? null;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function generateQrImageUrl(ticketCode: string): string {
  // Uses an external QR image API — actual HTTPS URLs are supported by all email clients,
  // whereas base64 data URLs are blocked by Gmail, Outlook and Apple Mail.
  // Matches in-app QR: same ticketCode value, error correction M, dark #111111 on white.
  const params = new URLSearchParams({
    data: ticketCode,
    size: "200x200",
    color: "111111",
    bgcolor: "ffffff",
    margin: "10",
    ecc: "M",
    format: "png",
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export interface TicketEmailParams {
  toEmail: string;
  toName: string;
  eventName: string;
  eventDate: string | Date | null | undefined;
  eventLocation: string | null | undefined;
  ticketCodes: string[];
}

export interface GiftEmailParams {
  toEmail: string;
  toName: string;
  gifterName: string;
  eventName: string;
  eventDate: string | Date | null | undefined;
  eventLocation: string | null | undefined;
  ticketCode: string;
}

const DEFAULT_SUBJECT = "Your ticket is confirmed! 🎉";
const DEFAULT_GIFT_SUBJECT = "You've been gifted a ticket! 🎁";
const DEFAULT_GIFT_BODY = `Hey {{recipientName}},

Great news — {{gifterName}} has gifted you a ticket to {{eventName}}! Show your ticket code at the door and we'll see you on the court! 🎯`;
const DEFAULT_FROM_NAME = "The Dodge Club";
const DEFAULT_FROM_EMAIL = "info@thedodgeclub.co.uk";

export function buildStructuredEmailHtml(opts: {
  headerImageUrl?: string | null;
  bodyText?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  ticketCodes?: string[] | null;
}): string {
  const { headerImageUrl, bodyText, ctaText, ctaUrl, ticketCodes } = opts;

  const headerImageBlock = headerImageUrl
    ? `<img src="${headerImageUrl}" alt="Event" style="width:100%;display:block;border-radius:0;" />`
    : "";

  const bodyLines = (bodyText || "Hey {{userName}},\n\nYou're in! Here are your details below.")
    .split("\n")
    .map((l) => l.trim() === "" ? "<br/>" : `<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);font-size:15px;line-height:1.6;">${l}</p>`)
    .join("\n");

  const ctaBlock =
    ctaText && ctaUrl
      ? `<div style="text-align:center;margin:28px 0 8px;">
          <a href="${ctaUrl}" style="display:inline-block;background:#0B5E2F;color:#FFD700;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;letter-spacing:0.3px;">${ctaText}</a>
        </div>`
      : "";

  const codes = ticketCodes && ticketCodes.length > 0 ? ticketCodes : null;
  const ticketBlock = codes
    ? codes.map((code, i) => {
        const qrUrl = generateQrImageUrl(code);
        const label = codes.length > 1 ? `Ticket ${i + 1} of ${codes.length} — Scan at the door` : "Your Ticket — Scan at the door";
        return `<div style="background:#ffffff;border-radius:12px;padding:20px;text-align:center;margin:16px 0;">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:#555;margin:0 0 12px;">${label}</p>
        <img src="${qrUrl}" alt="Ticket QR Code" width="200" height="200" style="display:block;margin:0 auto;border-radius:8px;" />
        <p style="font-family:'Courier New',monospace;font-size:14px;font-weight:bold;color:#111;letter-spacing:2px;margin:12px 0 0;">${code}</p>
      </div>`;
      }).join("\n")
    : `<div style="background:#0D0D0D;border:1px dashed #FFD700;border-radius:8px;padding:16px;text-align:center;margin:24px 0;">
        <p style="font-size:12px;color:rgba(255,255,255,0.5);letter-spacing:0.8px;text-transform:uppercase;margin:0 0 6px;">Your Ticket Code</p>
        <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:bold;color:#FFD700;letter-spacing:3px;margin:0;">{{ticketCode}}</p>
      </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:540px;margin:40px auto;background:#151515;border-radius:12px;overflow:hidden;">
    ${headerImageBlock}
    <div style="background:#0B5E2F;padding:28px 32px 22px;text-align:center;">
      <h1 style="margin:0;font-size:26px;color:#FFD700;letter-spacing:-0.5px;">The Dodge Club</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Your ticket is confirmed</p>
    </div>
    <div style="padding:32px;">
      ${bodyLines}
      <div style="background:rgba(11,94,47,0.13);border:1px solid #0B5E2F;border-radius:10px;padding:20px 24px;margin:24px 0;">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.4);margin:0 0 3px;">Event</p>
        <p style="font-size:15px;color:#fff;font-weight:500;margin:0 0 14px;">{{eventName}}</p>
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.4);margin:0 0 3px;">Date</p>
        <p style="font-size:15px;color:#fff;font-weight:500;margin:0 0 14px;">{{eventDate}}</p>
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.4);margin:0 0 3px;">Location</p>
        <p style="font-size:15px;color:#fff;font-weight:500;margin:0;">{{eventLocation}}</p>
      </div>
      ${ticketBlock}
      ${ctaBlock}
      <p style="font-size:13px;color:rgba(255,255,255,0.4);text-align:center;margin:20px 0 0;">Show this at the door. See you on the court!</p>
    </div>
    <div style="padding:20px 32px;text-align:center;font-size:12px;color:rgba(255,255,255,0.25);border-top:1px solid #222;">
      The Dodge Club &bull; This is an automated confirmation email
    </div>
  </div>
</body>
</html>`;
}

export async function sendGiftEmail(params: GiftEmailParams): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("[email] BREVO_API_KEY not set — skipping gift email");
    return;
  }

  const [fromName, fromEmail, subjectTpl, headerImageUrl, bodyText, ctaText, ctaUrl] =
    await Promise.all([
      getSetting("emailFromName"),
      getSetting("emailFromAddress"),
      getSetting("giftEmailSubject"),
      getSetting("giftEmailHeaderImageUrl"),
      getSetting("giftEmailBodyText"),
      getSetting("giftEmailCtaText"),
      getSetting("giftEmailCtaUrl"),
    ]);

  const vars: Record<string, string> = {
    recipientName: params.toName,
    userName: params.toName,
    gifterName: params.gifterName,
    eventName: params.eventName,
    eventDate: formatDate(params.eventDate),
    eventLocation: params.eventLocation ?? "TBD",
    ticketCode: params.ticketCode,
  };

  const subject = interpolate(subjectTpl ?? DEFAULT_GIFT_SUBJECT, vars);
  const effectiveBody = bodyText ?? DEFAULT_GIFT_BODY;

  const html = interpolate(
    buildStructuredEmailHtml({ headerImageUrl, bodyText: effectiveBody, ctaText, ctaUrl, ticketCodes: [params.ticketCode] }),
    vars
  );

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
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Brevo API ${resp.status}: ${body}`);
  }

  console.log(`[email] Gift email sent to ${params.toEmail} for event "${params.eventName}"`);
}

export async function sendTicketConfirmationEmail(params: TicketEmailParams): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("[email] BREVO_API_KEY not set — skipping email");
    return;
  }

  const [fromName, fromEmail, subjectTpl, rawBodyHtml, headerImageUrl, bodyText, ctaText, ctaUrl] =
    await Promise.all([
      getSetting("emailFromName"),
      getSetting("emailFromAddress"),
      getSetting("emailSubject"),
      getSetting("emailBodyHtml"),
      getSetting("emailHeaderImageUrl"),
      getSetting("emailBodyText"),
      getSetting("emailCtaText"),
      getSetting("emailCtaUrl"),
    ]);

  const vars: Record<string, string> = {
    userName: params.toName,
    eventName: params.eventName,
    eventDate: formatDate(params.eventDate),
    eventLocation: params.eventLocation ?? "TBD",
    ticketCode: params.ticketCodes[0] ?? "",
  };

  const subject = interpolate(subjectTpl ?? DEFAULT_SUBJECT, vars);

  // Use raw override only if explicitly set (not the old default HTML)
  const useRawOverride = rawBodyHtml && rawBodyHtml.trim().length > 0 && !headerImageUrl && !bodyText && !ctaText;
  const html = interpolate(
    useRawOverride
      ? rawBodyHtml!
      : buildStructuredEmailHtml({ headerImageUrl, bodyText, ctaText, ctaUrl, ticketCodes: params.ticketCodes }),
    vars
  );

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
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Brevo API ${resp.status}: ${body}`);
  }

  console.log(`[email] Confirmation sent to ${params.toEmail} for event "${params.eventName}"`);
}
