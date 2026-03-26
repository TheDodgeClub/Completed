import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, attendanceTable, awardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/* ---------- in-memory OTP store ---------- */
interface OtpEntry { code: string; expires: number }
const otpStore = new Map<string, OtpEntry>();

async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("[auth] BREVO_API_KEY not set — reset code:", code);
    return;
  }
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0D0D0D;color:#fff;margin:0;padding:0}
  .wrap{max-width:480px;margin:40px auto;background:#151515;border-radius:12px;overflow:hidden}
  .hdr{background:#0B5E2F;padding:28px 32px;text-align:center}
  .hdr h1{margin:0;font-size:24px;color:#FFD700}
  .hdr p{margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px}
  .body{padding:32px}
  .code-box{background:#0D0D0D;border:1px dashed #FFD700;border-radius:8px;padding:20px;text-align:center;margin:24px 0}
  .code{font-family:'Courier New',monospace;font-size:36px;font-weight:bold;color:#FFD700;letter-spacing:10px}
  .note{font-size:13px;color:rgba(255,255,255,0.5);text-align:center;margin-top:8px}
  .footer{padding:16px 32px;text-align:center;font-size:11px;color:rgba(255,255,255,0.25);border-top:1px solid #222}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>The Dodge Club</h1><p>Password reset request</p></div>
  <div class="body">
    <p>Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
    <div class="code-box"><div class="code">${code}</div></div>
    <p class="note">If you didn't request this, you can safely ignore this email.</p>
  </div>
  <div class="footer">The Dodge Club &bull; Automated security email</div>
</div></body></html>`;

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

function computeXP(eventsAttended: number, medalsEarned: number, ringsEarned: number, bonusXp: number = 0): number {
  return eventsAttended * 50 + medalsEarned * 300 + ringsEarned * 1000 + bonusXp;
}

function computeLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

function toProfile(
  user: typeof usersTable.$inferSelect,
  eventsAttended: number,
  medalsEarned: number,
  ringsEarned: number,
) {
  const xp = computeXP(eventsAttended, medalsEarned, ringsEarned, user.bonusXp ?? 0);
  const level = computeLevel(xp);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    memberSince: (user.memberSince ?? user.createdAt).toISOString(),
    eventsAttended,
    medalsEarned,
    ringsEarned,
    xp,
    level,
    avatarUrl: user.avatarUrl ?? null,
    username: user.username ?? null,
    preferredRole: user.preferredRole ?? null,
    bio: user.bio ?? null,
    isElite: user.isElite,
    eliteSince: user.eliteSince?.toISOString() ?? null,
  };
}

async function getUserStats(userId: number) {
  const [records, awards] = await Promise.all([
    db.select().from(attendanceTable).where(eq(attendanceTable.userId, userId)),
    db.select().from(awardsTable).where(eq(awardsTable.userId, userId)),
  ]);
  const eventsAttended = records.length;
  const medalsEarned = records.filter(r => r.earnedMedal).length + awards.filter(a => a.type === "medal").length;
  const ringsEarned = awards.filter(a => a.type === "ring").length;
  return { eventsAttended, medalsEarned, ringsEarned };
}

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

  const { eventsAttended, medalsEarned, ringsEarned } = await getUserStats(user.id);
  res.json(toProfile(user, eventsAttended, medalsEarned, ringsEarned));
});

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/* ---------- POST /api/auth/register ---------- */
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
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

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name }).returning();

  req.session = { userId: user.id };
  res.json({ user: toProfile(user, 0, 0, 0), token: String(user.id) });
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

  const { eventsAttended, medalsEarned, ringsEarned } = await getUserStats(user.id);
  req.session = { userId: user.id };
  res.json({ user: toProfile(user, eventsAttended, medalsEarned, ringsEarned), token: String(user.id) });
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
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email.toLowerCase()) });
  if (!user) {
    res.json({ message: "If an account exists, a reset code has been sent." });
    return;
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(email.toLowerCase(), { code, expires: Date.now() + 10 * 60 * 1000 });
  try {
    await sendPasswordResetEmail(email.toLowerCase(), code);
  } catch (err) {
    console.error("[auth] Failed to send reset email:", err);
    res.status(500).json({ error: "Failed to send reset email. Please try again." });
    return;
  }
  res.json({ message: "If an account exists, a reset code has been sent." });
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
  const entry = otpStore.get(email.toLowerCase());
  if (!entry || entry.code !== String(code) || Date.now() > entry.expires) {
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
  otpStore.delete(email.toLowerCase());
  res.json({ message: "Password updated successfully" });
});

export default router;
