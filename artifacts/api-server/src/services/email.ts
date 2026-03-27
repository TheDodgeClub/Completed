import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row?.value ?? null;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function toAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = (process.env.APP_URL ?? "https://thedodgeclub.co.uk").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
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

export interface EventEmailConfig {
  emailSubject?: string | null;
  emailHeaderImageUrl?: string | null;
  emailBodyText?: string | null;
  emailCtaText?: string | null;
  emailCtaUrl?: string | null;
  emailVideoUrl?: string | null;
  giftEmailSubject?: string | null;
  giftEmailHeaderImageUrl?: string | null;
  giftEmailBodyText?: string | null;
  giftEmailCtaText?: string | null;
  giftEmailCtaUrl?: string | null;
  giftEmailVideoUrl?: string | null;
}

export interface TicketEmailParams {
  toEmail: string;
  toName: string;
  eventName: string;
  eventDate: string | Date | null | undefined;
  eventLocation: string | null | undefined;
  ticketCodes: string[];
  eventConfig?: EventEmailConfig | null;
}

export interface GiftEmailParams {
  toEmail: string;
  toName: string;
  gifterName: string;
  eventName: string;
  eventDate: string | Date | null | undefined;
  eventLocation: string | null | undefined;
  ticketCode: string;
  eventConfig?: EventEmailConfig | null;
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
  videoUrl?: string | null;
  ticketCodes?: string[] | null;
  logoUrl?: string | null;
}): string {
  const { headerImageUrl, bodyText, ctaText, ctaUrl, videoUrl, ticketCodes, logoUrl } = opts;

  const headerImageBlock = headerImageUrl
    ? `<img src="${headerImageUrl}" alt="Event" style="width:100%;display:block;border-radius:0;" />`
    : "";

  const bodyLines = (bodyText || "Hey {{userName}},\n\nYou're in for {{eventName}} on {{eventDate}}!\n\nYour ticket details are below. See you on the court!")
    .split("\n")
    .map((l) => l.trim() === "" ? "<br/>" : `<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);font-size:15px;line-height:1.6;">${l}</p>`)
    .join("\n");

  const videoBlock = videoUrl
    ? `<div style="text-align:center;margin:20px 0;">
        <a href="${videoUrl}" style="display:inline-flex;align-items:center;gap:8px;background:#1a1a1a;color:#FFD700;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;border:1px solid #333;">
          ▶ Watch Video
        </a>
      </div>`
    : "";

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
      ${logoUrl
        ? `<img src="${logoUrl}" alt="The Dodge Club" style="height:48px;width:auto;display:inline-block;margin:0 auto 10px;" />`
        : `<h1 style="margin:0;font-size:26px;color:#FFD700;letter-spacing:-0.5px;">The Dodge Club</h1>`}
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
      ${videoBlock}
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

function isValidEmail(email: string | null | undefined): boolean {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendGiftEmail(params: GiftEmailParams): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("[email] BREVO_API_KEY not set — skipping gift email");
    return;
  }
  if (!isValidEmail(params.toEmail)) {
    console.warn(`[email] Skipping gift email — invalid address: "${params.toEmail}"`);
    return;
  }

  const [fromName, fromEmail, globalSubject, globalHeader, globalBody, globalCtaText, globalCtaUrl, rawLogoUrl] =
    await Promise.all([
      getSetting("emailFromName"),
      getSetting("emailFromAddress"),
      getSetting("giftEmailSubject"),
      getSetting("giftEmailHeaderImageUrl"),
      getSetting("giftEmailBodyText"),
      getSetting("giftEmailCtaText"),
      getSetting("giftEmailCtaUrl"),
      getSetting("emailLogoUrl"),
    ]);

  const ec = params.eventConfig;
  const subjectTpl = ec?.giftEmailSubject || globalSubject;
  const headerImageUrl = toAbsoluteUrl(ec?.giftEmailHeaderImageUrl || globalHeader);
  const bodyText = ec?.giftEmailBodyText || globalBody;
  const ctaText = ec?.giftEmailCtaText || globalCtaText;
  const ctaUrl = ec?.giftEmailCtaUrl || globalCtaUrl;
  const videoUrl = ec?.giftEmailVideoUrl || null;
  const logoUrl = toAbsoluteUrl(rawLogoUrl);

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
    buildStructuredEmailHtml({ headerImageUrl, bodyText: effectiveBody, ctaText, ctaUrl, videoUrl, ticketCodes: [params.ticketCode], logoUrl }),
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
  if (!isValidEmail(params.toEmail)) {
    console.warn(`[email] Skipping confirmation email — invalid address: "${params.toEmail}"`);
    return;
  }

  const [fromName, fromEmail, globalSubject, rawBodyHtml, globalHeader, globalBody, globalCtaText, globalCtaUrl, rawLogoUrl] =
    await Promise.all([
      getSetting("emailFromName"),
      getSetting("emailFromAddress"),
      getSetting("emailSubject"),
      getSetting("emailBodyHtml"),
      getSetting("emailHeaderImageUrl"),
      getSetting("emailBodyText"),
      getSetting("emailCtaText"),
      getSetting("emailCtaUrl"),
      getSetting("emailLogoUrl"),
    ]);

  const ec = params.eventConfig;
  const subjectTpl = ec?.emailSubject || globalSubject;
  const headerImageUrl = toAbsoluteUrl(ec?.emailHeaderImageUrl || globalHeader);
  const bodyText = ec?.emailBodyText || globalBody;
  const ctaText = ec?.emailCtaText || globalCtaText;
  const ctaUrl = ec?.emailCtaUrl || globalCtaUrl;
  const videoUrl = ec?.emailVideoUrl || null;
  const logoUrl = toAbsoluteUrl(rawLogoUrl);

  const vars: Record<string, string> = {
    userName: params.toName,
    eventName: params.eventName,
    eventDate: formatDate(params.eventDate),
    eventLocation: params.eventLocation ?? "TBD",
    ticketCode: params.ticketCodes[0] ?? "",
  };

  const subject = interpolate(subjectTpl ?? DEFAULT_SUBJECT, vars);

  // Use raw override only if explicitly set (not the old default HTML) and no per-event config
  const useRawOverride = !ec && rawBodyHtml && rawBodyHtml.trim().length > 0 && !headerImageUrl && !bodyText && !ctaText;
  const html = interpolate(
    useRawOverride
      ? rawBodyHtml!
      : buildStructuredEmailHtml({ headerImageUrl, bodyText, ctaText, ctaUrl, videoUrl, ticketCodes: params.ticketCodes, logoUrl }),
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
