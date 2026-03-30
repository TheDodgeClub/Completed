import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const ELITE_XP_BONUS = 500;

// ─── Shared email design (off-white polished) ─────────────────────────────────
const C = {
  bg: "#f0ede8",
  card: "#ffffff",
  headerBg: "#2A1600",
  headerGold: "#C8960C",
  text: "#1a1a1a",
  subtext: "#555555",
  muted: "#888888",
  border: "#e0ddd6",
  goldBox: "#FFF8D6",
  goldBorder: "#E8C84A",
  metaBg: "#f8f6f2",
  btnBg: "#2A1600",
  btnText: "#FFD700",
  returning: "#f5f5f5",
  returningBorder: "#d8d5d0",
};

async function sendEliteWelcomeEmail(
  email: string,
  name: string,
  xpAwarded: boolean,
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    logger.warn("[activateElite] BREVO_API_KEY not set — skipping welcome email");
    return;
  }

  const firstName = name.split(" ")[0];
  const isReturning = !xpAwarded;

  const subject = isReturning
    ? "⭐ Welcome back to Elite — your perks are live again!"
    : "⭐ Welcome to Elite — your 500 XP bonus is ready!";

  const xpSection = xpAwarded
    ? `<div style="background:${C.goldBox};border:1px solid ${C.goldBorder};border-radius:10px;padding:18px 20px;text-align:center;margin:24px 0;">
        <p style="font-size:30px;font-weight:800;color:${C.headerGold};margin:0;letter-spacing:-0.5px;">+500 XP</p>
        <p style="font-size:13px;color:${C.subtext};margin:4px 0 0;">Elite welcome bonus — already in your account</p>
      </div>`
    : `<div style="background:${C.returning};border:1px solid ${C.returningBorder};border-radius:10px;padding:14px 18px;margin:24px 0;">
        <p style="font-size:13px;color:${C.subtext};margin:0;line-height:1.55;">
          The one-time XP bonus was awarded on your first Elite membership — your rank and progress are fully intact!
        </p>
      </div>`;

  const intro = isReturning
    ? `We're glad to have you back on the Elite roster. Your perks are active again immediately.`
    : `Your Elite membership is now live — welcome to the top tier of The Dodge Club.`;

  const perks = [
    ["⭐", "Elite badge", "Shows on your profile and player card"],
    ["⚡", "Double XP", "Every event earns you twice the experience"],
    ["🎁", "Merch discount", "Exclusive monthly discount in the store"],
    ["📌", "Priority spots", "Reserve early access to sold-out events"],
    ["🏆", "Elite leaderboard", "Compete on the members-only ranking"],
    ["🚪", "VIP check-in", "Skip the queue with a dedicated lane at the door"],
  ];

  const perksHtml = perks.map(([icon, title, desc]) => `
    <tr>
      <td style="width:36px;padding:10px 12px 10px 0;vertical-align:top;font-size:18px;">${icon}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${C.border};">
        <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:${C.text};">${title}</p>
        <p style="margin:0;font-size:13px;color:${C.subtext};">${desc}</p>
      </td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:${C.card};border-radius:12px;overflow:hidden;border:1px solid ${C.border};box-shadow:0 2px 12px rgba(0,0,0,0.06);">

    <!-- Header -->
    <div style="background:${C.headerBg};padding:30px 32px;text-align:center;">
      <p style="font-size:36px;margin:0 0 8px;">⭐</p>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${C.headerGold};letter-spacing:0.5px;">
        ${isReturning ? "WELCOME BACK, ELITE" : "WELCOME TO ELITE"}
      </h1>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">
        ${isReturning ? "Your Elite membership is active again" : "You're now an Elite member of The Dodge Club"}
      </p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="margin:0 0 14px;font-size:15px;color:${C.text};line-height:1.65;">Hi ${firstName},</p>
      <p style="margin:0 0 14px;font-size:15px;color:${C.text};line-height:1.65;">${intro}</p>

      ${xpSection}

      <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:${C.subtext};text-transform:uppercase;letter-spacing:0.6px;">Your Elite perks</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${perksHtml}
      </table>

      <p style="margin:0 0 14px;font-size:15px;color:${C.text};line-height:1.65;">See you on the court — keep dodging!</p>
      <p style="margin:0 0 24px;font-size:15px;color:${C.text};line-height:1.65;"><strong>The Dodge Club team</strong></p>

      <hr style="border:none;border-top:1px solid ${C.border};margin:24px 0;" />
      <p style="margin:0;font-size:12px;color:${C.muted};text-align:center;">
        You can cancel your Elite membership anytime from the app — no hidden fees.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:18px 32px;text-align:center;font-size:12px;color:${C.muted};border-top:1px solid ${C.border};background:${C.bg};">
      The Dodge Club &bull; Elite Membership &bull; thedodgeclub.co.uk
    </div>
  </div>
</body>
</html>`;

  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "The Dodge Club", email: "info@thedodgeclub.co.uk" },
      to: [{ email, name }],
      subject,
      htmlContent: html,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    logger.error({ status: resp.status, body }, "[activateElite] Brevo email failed");
  } else {
    logger.info({ email }, "[activateElite] Elite welcome email sent");
  }
}

export async function activateElite(userId: number): Promise<{ xpAwarded: boolean }> {
  // Atomically award XP exactly once: only updates rows where elite_xp_awarded IS FALSE.
  // This is concurrency-safe — if two activations race, only one will match the WHERE clause.
  const xpRows = await db
    .update(usersTable)
    .set({
      bonusXp: sql`${usersTable.bonusXp} + ${ELITE_XP_BONUS}`,
      eliteXpAwarded: true,
      pendingEliteXpAwarded: true,
    })
    .where(sql`${usersTable.id} = ${userId} AND ${usersTable.eliteXpAwarded} = false`)
    .returning({ id: usersTable.id });

  const xpAwarded = xpRows.length > 0;

  // Set core Elite status fields unconditionally (idempotent).
  const user = await db
    .update(usersTable)
    .set({
      isElite: true,
      eliteSince: new Date(),
      pendingEliteCelebration: true,
      ...(xpAwarded ? {} : { pendingEliteXpAwarded: false }),
    })
    .where(eq(usersTable.id, userId))
    .returning({ email: usersTable.email, name: usersTable.name });

  if (!user[0]) {
    logger.warn({ userId }, "[activateElite] User not found");
    return { xpAwarded: false };
  }

  logger.info({ userId, xpAwarded }, "[activateElite] Elite activated");

  sendEliteWelcomeEmail(user[0].email, user[0].name, xpAwarded).catch((err: unknown) =>
    logger.error({ err, userId }, "[activateElite] Welcome email error"),
  );

  return { xpAwarded };
}

export async function deactivateElite(
  userId: number,
  options: { clearStripeSubscription?: boolean } = {},
): Promise<void> {
  const updates: Partial<typeof usersTable.$inferInsert> = {
    isElite: false,
    pendingEliteCelebration: false,
    pendingEliteXpAwarded: false,
  };
  if (options.clearStripeSubscription) {
    updates.stripeSubscriptionId = null;
  }
  await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
  logger.info({ userId, clearStripeSubscription: options.clearStripeSubscription ?? false }, "[activateElite] Elite deactivated");
}
