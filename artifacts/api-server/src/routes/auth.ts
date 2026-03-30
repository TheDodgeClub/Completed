import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db, usersTable, attendanceTable, awardsTable, eventsTable, postsTable, passwordResetTokensTable } from "@workspace/db";
import { eq, lte, sql, and, lt } from "drizzle-orm";
import { sendWelcomeEmail } from "../services/email";

async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("[auth] BREVO_API_KEY not set — reset code:", code);
    return;
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0ddd6;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <div style="background:#0B3E1E;padding:28px 32px;text-align:center;">
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#ffffff;">The Dodge Club</h1>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">Password reset request</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.65;">Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
      <div style="background:#f8f6f2;border:1px solid #e0ddd6;border-radius:10px;padding:24px;text-align:center;margin:24px 0;">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.7px;color:#888888;margin:0 0 10px;">Your reset code</p>
        <p style="font-family:'Courier New',monospace;font-size:38px;font-weight:bold;color:#0B3E1E;letter-spacing:8px;margin:0;">${code}</p>
      </div>
      <p style="font-size:13px;color:#888888;text-align:center;margin:0;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div style="padding:18px 32px;text-align:center;font-size:12px;color:#888888;border-top:1px solid #e0ddd6;background:#f0ede8;">
      The Dodge Club &bull; Automated security email
    </div>
  </div>
</body>
</html>`;

  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      sender: { name: "The Dodge Club", email: "info@thedodgeclub.co.uk" },
      to: [{ email }],
      subject: "Your Dodge Club password reset code",
      htmlContent: html,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Brevo ${resp.status}: ${body}`);
  }
  console.log(`[auth] Reset code sent to ${email}`);
}

const router: IRouter = Router();

/* ---------- helpers ---------- */
const LEVEL_THRESHOLDS = [0, 300, 800, 1600, 2500, 5000, 10000, 20000, 40000, 80000];

const ATTENDANCE_MILESTONES = [
  { events: 5,  bonus: 100  },
  { events: 10, bonus: 250  },
  { events: 25, bonus: 500  },
  { events: 50, bonus: 1000 },
];

function computeAttendanceXP(attendedEventIds: Set<number>, pastEvents: { id: number; xpReward: number }[]) {
  let streak = 0, bestStreak = 0, eventXP = 0, attendedCount = 0;
  for (const event of pastEvents) {
    if (attendedEventIds.has(event.id)) {
      streak++;
      attendedCount++;
      eventXP += (event.xpReward ?? 50) + (streak >= 8 ? 50 : streak >= 4 ? 25 : streak >= 2 ? 10 : 0);
      for (const m of ATTENDANCE_MILESTONES) { if (attendedCount === m.events) { eventXP += m.bonus; break; } }
      if (streak > bestStreak) bestStreak = streak;
    } else { streak = 0; }
  }
  return { eventXP, currentStreak: streak, bestStreak, eventsAttended: attendedCount };
}

function computeXP(eventXP: number, medalsEarned: number, ringsEarned: number, bonusXp: number = 0): number {
  return eventXP + medalsEarned * 300 + ringsEarned * 1000 + bonusXp;
}

function computeLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

function generateReferralCode(name: string, id: number): string {
  const base = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4).padEnd(4, "X");
  const suffix = String(id).padStart(4, "0");
  return `${base}${suffix}`;
}

function toProfile(
  user: typeof usersTable.$inferSelect,
  stats: { eventsAttended: number; medalsEarned: number; ringsEarned: number; xp: number; level: number; currentStreak: number; bestStreak: number },
) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    memberSince: (user.memberSince ?? user.createdAt).toISOString(),
    eventsAttended: stats.eventsAttended,
    medalsEarned: stats.medalsEarned,
    ringsEarned: stats.ringsEarned,
    xp: stats.xp,
    level: stats.level,
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    avatarUrl: user.avatarUrl ?? null,
    username: user.username ?? null,
    preferredRole: user.preferredRole ?? null,
    bio: user.bio ?? null,
    skills: user.skills ?? null,
    accountType: user.accountType ?? "player",
    referralCode: user.referralCode ?? null,
    isElite: user.isElite ?? false,
    eliteSince: user.eliteSince?.toISOString() ?? null,
    pendingEliteCelebration: user.pendingEliteCelebration ?? false,
    pendingEliteXpAwarded: user.pendingEliteXpAwarded ?? false,
  };
}

async function getUserStats(userId: number, bonusXp: number = 0) {
  const [records, awards, pastEvents] = await Promise.all([
    db.select().from(attendanceTable).where(eq(attendanceTable.userId, userId)),
    db.select().from(awardsTable).where(eq(awardsTable.userId, userId)),
    db.select({ id: eventsTable.id, xpReward: eventsTable.xpReward }).from(eventsTable).where(lte(eventsTable.date, new Date(Date.now() + 30 * 60 * 1000))).orderBy(eventsTable.date),
  ]);
  const attendedIds = new Set(records.map(r => r.eventId));
  const { eventXP, currentStreak, bestStreak, eventsAttended } = computeAttendanceXP(attendedIds, pastEvents);
  const medalsEarned = records.filter(r => r.earnedMedal).length + awards.filter(a => a.type === "medal").length;
  const ringsEarned = awards.filter(a => a.type === "ring").length;
  const xp = computeXP(eventXP, medalsEarned, ringsEarned, bonusXp);
  const level = computeLevel(xp);
  return { eventsAttended, medalsEarned, ringsEarned, xp, level, currentStreak, bestStreak };
}

/* ---------- POST /api/auth/ack-elite-celebration ---------- */
router.post("/ack-elite-celebration", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.update(usersTable).set({ pendingEliteCelebration: false, pendingEliteXpAwarded: false }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

/* ---------- GET /api/auth/me ---------- */
router.get("/me", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const stats = await getUserStats(user.id, user.bonusXp ?? 0);
  res.json(toProfile(user, stats));
});

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/* GET /api/auth/check-email?email=... — public, no auth required */
router.get("/check-email", async (req, res) => {
  const raw = (req.query.email as string | undefined) ?? "";
  const email = raw.trim().toLowerCase();
  if (!email || !isValidEmail(email)) { res.json({ exists: false }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email), columns: { id: true } });
  res.json({ exists: !!user });
});

/* ---------- POST /api/auth/register ---------- */
router.post("/register", async (req, res) => {
  const { email, password, name, accountType, referralCode: incomingReferralCode } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Please enter a valid email address" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
  if (existing) {
    res.status(409).json({ error: "User already exists" });
    return;
  }

  let referredById: number | undefined;
  if (incomingReferralCode) {
    const referrer = await db.query.usersTable.findFirst({ where: eq(usersTable.referralCode, incomingReferralCode.toUpperCase()) });
    if (referrer) referredById = referrer.id;
  }

  const SIGNUP_BONUS_XP = 25;
  const passwordHash = await bcrypt.hash(password, 10);
  const resolvedAccountType = accountType === "supporter" ? "supporter" : "player";
  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
    name,
    accountType: resolvedAccountType,
    referredBy: referredById,
    bonusXp: SIGNUP_BONUS_XP,
  }).returning();

  const code = generateReferralCode(name, user.id);
  const [updatedUser] = await db.update(usersTable).set({ referralCode: code }).where(eq(usersTable.id, user.id)).returning();

  if (referredById) {
    await db.update(usersTable)
      .set({ bonusXp: sql`COALESCE(${usersTable.bonusXp}, 0) + 25` })
      .where(eq(usersTable.id, referredById));
  }

  req.session = { userId: updatedUser.id };
  const signupStats = { eventsAttended: 0, medalsEarned: 0, ringsEarned: 0, xp: SIGNUP_BONUS_XP, level: 1, currentStreak: 0, bestStreak: 0 };

  // Send welcome email — fire-and-forget so it never delays the signup response
  sendWelcomeEmail(updatedUser.email, updatedUser.name).catch((err: unknown) =>
    console.error("[auth] Welcome email failed:", err),
  );

  res.json({ user: toProfile(updatedUser, signupStats), token: String(updatedUser.id) });
});

/* ---------- POST /api/auth/login ---------- */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Missing credentials" });
    return;
  }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "Your account has been suspended. Please contact support." });
    return;
  }

  const stats = await getUserStats(user.id, user.bonusXp ?? 0);
  req.session = { userId: user.id };
  res.json({ user: toProfile(user, stats), token: String(user.id) });
});

/* ---------- POST /api/auth/logout ---------- */
router.post("/logout", (req, res) => {
  req.session = null;
  res.json({ message: "Logged out" });
});

/* ---------- POST /api/auth/forgot-password ---------- */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  await db.delete(passwordResetTokensTable).where(lt(passwordResetTokensTable.expiresAt, new Date()));
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email.toLowerCase()) });
  if (!user) {
    res.json({ message: "If an account exists, a reset code has been sent." });
    return;
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.email, email.toLowerCase()));
  await db.insert(passwordResetTokensTable).values({ email: email.toLowerCase(), code, expiresAt });
  try {
    await sendPasswordResetEmail(email.toLowerCase(), code);
  } catch (err) {
    console.error("[auth] Failed to send reset email:", err);
    res.status(500).json({ error: "Failed to send reset email. Please try again." });
    return;
  }
  res.json({ message: "If an account exists, a reset code has been sent." });
});

/* ---------- DELETE /api/auth/account ---------- */
router.delete("/account", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(usersTable)
        .set({ referredBy: null })
        .where(eq(usersTable.referredBy, userId));
      await tx.delete(postsTable).where(eq(postsTable.authorId, userId));
      await tx.delete(usersTable).where(eq(usersTable.id, userId));
    });
    req.session = null;
    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error("[auth] delete account error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

/* ---------- POST /api/auth/reset-password ---------- */
router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  await db.delete(passwordResetTokensTable).where(lt(passwordResetTokensTable.expiresAt, new Date()));
  const entry = await db.query.passwordResetTokensTable.findFirst({
    where: and(
      eq(passwordResetTokensTable.email, email.toLowerCase()),
      eq(passwordResetTokensTable.code, String(code)),
    ),
  });
  if (!entry || entry.usedAt || entry.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email.toLowerCase()) });
  if (!user) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));
  await db.update(passwordResetTokensTable).set({ usedAt: new Date() }).where(eq(passwordResetTokensTable.id, entry.id));
  res.json({ message: "Password updated successfully" });
});

/* ─────── Google OAuth ─────── */

router.get("/google", (req: any, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) { res.status(503).json({ error: "Google Sign-In not configured" }); return; }

  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  const redirectUri = `https://${req.get("host")}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/google/callback", async (req: any, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const { code, state, error } = req.query as Record<string, string>;
  const appBase = `https://${req.get("host")}`;

  if (error || !code || state !== req.session.oauthState) {
    res.redirect(`${appBase}/?auth_error=google_failed`);
    return;
  }

  try {
    const redirectUri = `${appBase}/api/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) { res.redirect(`${appBase}/?auth_error=google_token_failed`); return; }

    const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const g = await infoRes.json() as any;
    const { sub: googleId, email, name, picture } = g;
    if (!email) { res.redirect(`${appBase}/?auth_error=google_no_email`); return; }

    let user = await db.query.usersTable.findFirst({ where: eq(usersTable.googleId as any, googleId) });

    if (!user) {
      const byEmail = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email.toLowerCase()) });
      if (byEmail) {
        await db.update(usersTable).set({ googleId } as any).where(eq(usersTable.id, byEmail.id));
        user = { ...byEmail, googleId };
      } else {
        const randomHash = await bcrypt.hash(crypto.randomUUID(), 10);
        const [created] = await db.insert(usersTable).values({
          email: email.toLowerCase(),
          passwordHash: randomHash,
          name: name || email.split("@")[0],
          avatarUrl: picture || null,
          googleId,
        } as any).returning();
        user = created;
      }
    }

    if ((user as any).isBanned) { res.redirect(`${appBase}/?auth_error=banned`); return; }

    req.session = { userId: user!.id };
    res.redirect(`${appBase}/`);
  } catch (err) {
    console.error("[google oauth]", err);
    res.redirect(`${appBase}/?auth_error=google_failed`);
  }
});

export default router;
