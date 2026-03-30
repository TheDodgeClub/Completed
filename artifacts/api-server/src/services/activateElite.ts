import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const ELITE_XP_BONUS = 500;

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

  const isReturning = !xpAwarded;
  const subject = isReturning
    ? "⭐ Welcome back to Elite — you're back in the game!"
    : "⭐ Welcome to Elite — your 500 XP bonus is ready!";

  const xpSection = xpAwarded
    ? `<div class="xp-box">
        <div class="xp">+500 XP</div>
        <div class="xp-label">Elite Welcome Bonus — already in your account</div>
      </div>`
    : `<div class="xp-box returning">
        <div class="xp-label">You've already received the one-time XP bonus from your first Elite membership — no extra XP this time, but your rank &amp; history are fully intact!</div>
      </div>`;

  const introText = isReturning
    ? `We're thrilled to have you back on the Elite roster. Your Elite perks are active again immediately.`
    : `Your Elite membership is now active — we're pumped to have you as one of our Elite members!`;

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0D0D0D;color:#fff;margin:0;padding:0}
  .wrap{max-width:480px;margin:40px auto;background:#151515;border-radius:12px;overflow:hidden}
  .hdr{background:linear-gradient(135deg,#3D2800,#1A1000);padding:32px;text-align:center}
  .star{font-size:52px;display:block;margin-bottom:12px}
  .hdr h1{margin:0;font-size:28px;color:#FFD700;font-weight:900;letter-spacing:2px}
  .hdr p{margin:8px 0 0;color:rgba(255,255,255,0.65);font-size:14px}
  .body{padding:32px}
  .body p{font-size:15px;color:rgba(255,255,255,0.85);line-height:1.6;margin:0 0 16px}
  .xp-box{background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.3);border-radius:10px;padding:16px;text-align:center;margin:20px 0}
  .xp-box.returning{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.12)}
  .xp-box .xp{font-size:32px;font-weight:900;color:#FFD700}
  .xp-box .xp-label{font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px}
  .perks{margin:20px 0;padding-left:0;list-style:none}
  .perks li{padding:6px 0;font-size:14px;color:rgba(255,255,255,0.75);border-bottom:1px solid rgba(255,255,255,0.06)}
  .perks li::before{content:"⭐ ";color:#FFD700}
  .cancel{font-size:12px;color:rgba(255,255,255,0.35);text-align:center;margin-top:20px}
  .footer{padding:16px 32px;text-align:center;font-size:11px;color:rgba(255,255,255,0.25);border-top:1px solid #222}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <span class="star">⭐</span>
    <h1>${isReturning ? "WELCOME BACK" : "WELCOME TO ELITE"}</h1>
    <p>${isReturning ? "Your Elite membership is active again" : "You're now an Elite member of The Dodge Club"}</p>
  </div>
  <div class="body">
    <p>Hi ${name},</p>
    <p>${introText}</p>
    ${xpSection}
    <p>Here's a reminder of what you've unlocked:</p>
    <ul class="perks">
      <li>Elite badge on your profile &amp; player card</li>
      <li>Double XP bonus at every event</li>
      <li>Exclusive monthly merch discount</li>
      <li>Priority spot reservation for sold-out events</li>
      <li>Members-only Elite leaderboard</li>
      <li>VIP check-in lane at the door</li>
    </ul>
    <p>See you on the court — keep dodging!</p>
    <p class="cancel">You can cancel your Elite membership anytime from the app — no hidden fees, no drama.</p>
  </div>
  <div class="footer">The Dodge Club &bull; Elite Membership</div>
</div></body></html>`;

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
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user) {
    logger.warn({ userId }, "[activateElite] User not found");
    return { xpAwarded: false };
  }

  const xpAwarded = !user.eliteXpAwarded;

  const updates: Partial<typeof usersTable.$inferInsert> = {
    isElite: true,
    eliteSince: user.eliteSince ?? new Date(),
    pendingEliteCelebration: true,
    pendingEliteXpAwarded: xpAwarded,
  };

  if (xpAwarded) {
    updates.bonusXp = (user.bonusXp ?? 0) + ELITE_XP_BONUS;
    updates.eliteXpAwarded = true;
  }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
  logger.info({ userId, xpAwarded }, "[activateElite] Elite activated");

  sendEliteWelcomeEmail(user.email, user.name, xpAwarded).catch((err: unknown) =>
    logger.error({ err, userId }, "[activateElite] Welcome email error"),
  );

  return { xpAwarded };
}

export async function deactivateElite(userId: number): Promise<void> {
  await db
    .update(usersTable)
    .set({ isElite: false, stripeSubscriptionId: null, pendingEliteCelebration: false, pendingEliteXpAwarded: false })
    .where(eq(usersTable.id, userId));
  logger.info({ userId }, "[activateElite] Elite deactivated");
}
