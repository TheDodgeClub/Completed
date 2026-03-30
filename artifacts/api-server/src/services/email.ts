import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

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
  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  const base = (
    process.env.APP_URL ||
    (replitDomain ? `https://${replitDomain}` : "https://thedodgeclub.co.uk")
  ).replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function generateQrImageUrl(ticketCode: string): string {
  const params = new URLSearchParams({
    data: ticketCode,
    size: "200x200",
    color: "0B3E1E",
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

export function isValidEmail(email: string | null | undefined): boolean {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Shared design system ────────────────────────────────────────────────────
// All emails use off-white/light parchment background with dark readable text

const COLORS = {
  bg: "#f0ede8",
  card: "#ffffff",
  headerBg: "#0B3E1E",
  headerText: "#ffffff",
  gold: "#C8960C",
  goldLight: "#FFF0C0",
  text: "#1a1a1a",
  subtext: "#555555",
  muted: "#888888",
  border: "#e0ddd6",
  accent: "#0B5E2F",
  accentLight: "#EAF5EE",
  metaBg: "#f8f6f2",
  metaBorder: "#e0ddd6",
  btnBg: "#0B3E1E",
  btnText: "#ffffff",
  codeBg: "#f8f6f2",
  codeBorder: "#d4cfc7",
};

const BASE_STYLES = `
  body { margin:0; padding:0; background:${COLORS.bg}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; }
  .wrap { max-width:560px; margin:32px auto; background:${COLORS.card}; border-radius:12px; overflow:hidden; border:1px solid ${COLORS.border}; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
  .header { background:${COLORS.headerBg}; padding:28px 32px 24px; text-align:center; }
  .header h1 { margin:0 0 4px; font-size:22px; font-weight:800; color:${COLORS.headerText}; letter-spacing:0.5px; }
  .header p { margin:0; font-size:13px; color:rgba(255,255,255,0.65); }
  .body { padding:32px; }
  p { margin:0 0 14px; font-size:15px; color:${COLORS.text}; line-height:1.65; }
  .meta-box { background:${COLORS.metaBg}; border:1px solid ${COLORS.metaBorder}; border-radius:10px; padding:20px 24px; margin:24px 0; }
  .meta-label { font-size:11px; text-transform:uppercase; letter-spacing:0.7px; color:${COLORS.muted}; margin:0 0 3px; }
  .meta-value { font-size:15px; color:${COLORS.text}; font-weight:600; margin:0 0 14px; }
  .meta-value:last-child { margin-bottom:0; }
  .btn { display:inline-block; background:${COLORS.btnBg}; color:${COLORS.btnText}; text-decoration:none; font-weight:700; font-size:15px; padding:14px 32px; border-radius:8px; letter-spacing:0.2px; }
  .divider { border:none; border-top:1px solid ${COLORS.border}; margin:24px 0; }
  .footer { padding:20px 32px; text-align:center; font-size:12px; color:${COLORS.muted}; border-top:1px solid ${COLORS.border}; background:${COLORS.bg}; }
`;

function emailWrap(header: string, body: string, footer?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="wrap">
    <div class="header">${header}</div>
    <div class="body">${body}</div>
    <div class="footer">${footer ?? "The Dodge Club &bull; This is an automated email"}</div>
  </div>
</body>
</html>`;
}

// ─── Ticket confirmation email ────────────────────────────────────────────────

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
  const { headerImageUrl, bodyText, ctaText, ctaUrl, videoUrl, ticketCodes } = opts;

  const headerImageBlock = headerImageUrl
    ? `<img src="${headerImageUrl}" alt="Event" style="width:100%;display:block;" />`
    : "";

  const bodyLines = (bodyText || "Hey {{userName}},\n\nYou're in for {{eventName}} on {{eventDate}}!\n\nYour ticket details are below. See you on the court!")
    .split("\n")
    .map((l) => l.trim() === "" ? "<br/>" : `<p>${l}</p>`)
    .join("\n");

  const videoBlock = videoUrl
    ? `<div style="text-align:center;margin:20px 0;">
        <a href="${videoUrl}" style="display:inline-flex;align-items:center;gap:8px;background:${COLORS.accentLight};color:${COLORS.accent};text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:8px;border:1px solid ${COLORS.border};">
          &#9654; Watch Video
        </a>
      </div>`
    : "";

  const ctaBlock = ctaText && ctaUrl
    ? `<div style="text-align:center;margin:28px 0 8px;">
        <a href="${ctaUrl}" class="btn">${ctaText}</a>
      </div>`
    : "";

  const codes = ticketCodes && ticketCodes.length > 0 ? ticketCodes : null;
  const ticketBlock = codes
    ? codes.map((code, i) => {
        const qrUrl = generateQrImageUrl(code);
        const label = codes.length > 1 ? `Ticket ${i + 1} of ${codes.length}` : "Your Ticket";
        return `<div style="background:${COLORS.codeBg};border:1px solid ${COLORS.codeBorder};border-radius:12px;padding:20px;text-align:center;margin:16px 0;">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:${COLORS.muted};margin:0 0 12px;">${label} — Scan at the door</p>
          <img src="${qrUrl}" alt="Ticket QR Code" width="180" height="180" style="display:block;margin:0 auto;border-radius:6px;" />
          <p style="font-family:'Courier New',monospace;font-size:15px;font-weight:bold;color:${COLORS.text};letter-spacing:2px;margin:12px 0 0;">${code}</p>
        </div>`;
      }).join("\n")
    : `<div style="background:${COLORS.codeBg};border:1px dashed ${COLORS.codeBorder};border-radius:8px;padding:16px;text-align:center;margin:24px 0;">
        <p style="font-size:11px;color:${COLORS.muted};letter-spacing:0.8px;text-transform:uppercase;margin:0 0 6px;">Your Ticket Code</p>
        <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:bold;color:${COLORS.accent};letter-spacing:3px;margin:0;">{{ticketCode}}</p>
      </div>`;

  const header = `
    ${headerImageBlock}
    <h1>Ticket Confirmed ✓</h1>
    <p>Your spot is locked in — see you on the court!</p>
  `;

  const body = `
    ${bodyLines}
    <div class="meta-box">
      <p class="meta-label">Event</p>
      <p class="meta-value">{{eventName}}</p>
      <p class="meta-label">Date</p>
      <p class="meta-value">{{eventDate}}</p>
      <p class="meta-label">Location</p>
      <p class="meta-value">{{eventLocation}}</p>
    </div>
    ${videoBlock}
    ${ticketBlock}
    ${ctaBlock}
    <p style="font-size:13px;color:${COLORS.muted};text-align:center;margin:20px 0 0;">Show your QR code at the door. Can't wait to see you!</p>
  `;

  return emailWrap(header, body);
}

async function sendBrevoEmail(opts: {
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    logger.warn("[email] BREVO_API_KEY not set — skipping email");
    return;
  }

  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: opts.fromName ?? DEFAULT_FROM_NAME, email: opts.fromEmail ?? DEFAULT_FROM_EMAIL },
      to: [{ email: opts.toEmail, name: opts.toName }],
      subject: opts.subject,
      htmlContent: opts.html,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Brevo API ${resp.status}: ${body}`);
  }
}

export async function sendGiftEmail(params: GiftEmailParams): Promise<void> {
  if (!isValidEmail(params.toEmail)) {
    logger.warn({ email: params.toEmail }, "[email] Skipping gift email — invalid address");
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
    buildStructuredEmailHtml({ headerImageUrl, bodyText: effectiveBody, ctaText, ctaUrl, videoUrl, ticketCodes: [params.ticketCode] }),
    vars,
  );

  await sendBrevoEmail({ toEmail: params.toEmail, toName: params.toName, subject, html, fromName: fromName ?? undefined, fromEmail: fromEmail ?? undefined });
  logger.info({ email: params.toEmail, event: params.eventName }, "[email] Gift email sent");
}

export async function sendTicketConfirmationEmail(params: TicketEmailParams): Promise<void> {
  if (!isValidEmail(params.toEmail)) {
    logger.warn({ email: params.toEmail }, "[email] Skipping confirmation email — invalid address");
    return;
  }

  const [fromName, fromEmail, globalSubject, rawBodyHtml, globalHeader, globalBody, globalCtaText, globalCtaUrl] =
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

  const ec = params.eventConfig;
  const subjectTpl = ec?.emailSubject || globalSubject;
  const headerImageUrl = toAbsoluteUrl(ec?.emailHeaderImageUrl || globalHeader);
  const bodyText = ec?.emailBodyText || globalBody;
  const ctaText = ec?.emailCtaText || globalCtaText;
  const ctaUrl = ec?.emailCtaUrl || globalCtaUrl;
  const videoUrl = ec?.emailVideoUrl || null;

  const vars: Record<string, string> = {
    userName: params.toName,
    eventName: params.eventName,
    eventDate: formatDate(params.eventDate),
    eventLocation: params.eventLocation ?? "TBD",
    ticketCode: params.ticketCodes[0] ?? "",
  };

  const subject = interpolate(subjectTpl ?? DEFAULT_SUBJECT, vars);
  const useRawOverride = !ec && rawBodyHtml && rawBodyHtml.trim().length > 0 && !headerImageUrl && !bodyText && !ctaText;
  const html = interpolate(
    useRawOverride
      ? rawBodyHtml!
      : buildStructuredEmailHtml({ headerImageUrl, bodyText, ctaText, ctaUrl, videoUrl, ticketCodes: params.ticketCodes }),
    vars,
  );

  await sendBrevoEmail({ toEmail: params.toEmail, toName: params.toName, subject, html, fromName: fromName ?? undefined, fromEmail: fromEmail ?? undefined });
  logger.info({ email: params.toEmail, event: params.eventName }, "[email] Ticket confirmation sent");
}

// ─── Welcome email ─────────────────────────────────────────────────────────

export async function sendWelcomeEmail(toEmail: string, toName: string): Promise<void> {
  if (!isValidEmail(toEmail)) return;

  const firstName = toName.split(" ")[0];

  const header = `
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">Welcome to The Dodge Club 🎯</h1>
    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.65);">Your membership is live — let's get dodging</p>
  `;

  const body = `
    <p>Hi ${firstName},</p>
    <p>We're genuinely thrilled to have you in the club. Here's a quick tour of everything waiting for you in the app:</p>

    <div style="margin:24px 0;">
      <!-- Feature: Events -->
      <div style="display:flex;align-items:flex-start;gap:14px;padding:16px;background:${COLORS.metaBg};border:1px solid ${COLORS.border};border-radius:10px;margin-bottom:10px;">
        <div style="min-width:36px;height:36px;border-radius:8px;background:${COLORS.accentLight};display:flex;align-items:center;justify-content:center;font-size:18px;text-align:center;line-height:36px;">🏐</div>
        <div>
          <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:${COLORS.text};">Book Events</p>
          <p style="margin:0;font-size:13px;color:${COLORS.subtext};">Browse upcoming sessions, grab tickets, and manage everything from the app.</p>
        </div>
      </div>

      <!-- Feature: XP & Levels -->
      <div style="display:flex;align-items:flex-start;gap:14px;padding:16px;background:${COLORS.metaBg};border:1px solid ${COLORS.border};border-radius:10px;margin-bottom:10px;">
        <div style="min-width:36px;height:36px;border-radius:8px;background:${COLORS.goldLight};display:flex;align-items:center;justify-content:center;font-size:18px;text-align:center;line-height:36px;">⚡</div>
        <div>
          <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:${COLORS.text};">Earn XP &amp; Level Up</p>
          <p style="margin:0;font-size:13px;color:${COLORS.subtext};">Every event you attend earns XP. Climb the leaderboard and unlock your rank.</p>
        </div>
      </div>

      <!-- Feature: Player Card -->
      <div style="display:flex;align-items:flex-start;gap:14px;padding:16px;background:${COLORS.metaBg};border:1px solid ${COLORS.border};border-radius:10px;margin-bottom:10px;">
        <div style="min-width:36px;height:36px;border-radius:8px;background:#EDE8FF;display:flex;align-items:center;justify-content:center;font-size:18px;text-align:center;line-height:36px;">🃏</div>
        <div>
          <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:${COLORS.text};">Your Player Card</p>
          <p style="margin:0;font-size:13px;color:${COLORS.subtext};">A personalised card that tracks your stats, medals, and rank. Share it with the world.</p>
        </div>
      </div>

      <!-- Feature: QR Check-in -->
      <div style="display:flex;align-items:flex-start;gap:14px;padding:16px;background:${COLORS.metaBg};border:1px solid ${COLORS.border};border-radius:10px;margin-bottom:10px;">
        <div style="min-width:36px;height:36px;border-radius:8px;background:#E8F3FF;display:flex;align-items:center;justify-content:center;font-size:18px;text-align:center;line-height:36px;">📲</div>
        <div>
          <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:${COLORS.text};">Instant QR Check-in</p>
          <p style="margin:0;font-size:13px;color:${COLORS.subtext};">Scan your QR code at the door — no paper tickets, no queues.</p>
        </div>
      </div>

      <!-- Feature: Elite -->
      <div style="display:flex;align-items:flex-start;gap:14px;padding:16px;background:${COLORS.goldLight};border:1px solid #E8C84A;border-radius:10px;margin-bottom:10px;">
        <div style="min-width:36px;height:36px;border-radius:8px;background:#FFF8D6;display:flex;align-items:center;justify-content:center;font-size:18px;text-align:center;line-height:36px;">⭐</div>
        <div>
          <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:${COLORS.text};">Go Elite</p>
          <p style="margin:0;font-size:13px;color:${COLORS.subtext};">Upgrade for double XP, priority booking, VIP check-in and an exclusive Elite badge. From £9.99/month.</p>
        </div>
      </div>
    </div>

    <hr class="divider" />
    <p>You started with <strong>25 XP</strong> just for joining — your first level-up is closer than you think.</p>
    <p>If you have any questions at all, just reply to this email and we'll get back to you.</p>
    <p>See you on the court,<br/><strong>The Dodge Club team</strong></p>
  `;

  const html = emailWrap(header, body, "The Dodge Club &bull; thedodgeclub.co.uk &bull; You're receiving this because you just joined");

  try {
    await sendBrevoEmail({ toEmail, toName, subject: "Welcome to The Dodge Club! 🎯", html });
    logger.info({ email: toEmail }, "[email] Welcome email sent");
  } catch (err) {
    logger.error({ err, email: toEmail }, "[email] Welcome email failed");
  }
}
