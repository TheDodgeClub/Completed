import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, attendanceTable, awardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/* ---------- helpers ---------- */
const LEVEL_THRESHOLDS = [0, 300, 700, 1200, 1800, 2500, 3300, 4200, 5200, 6300];

function computeXP(eventsAttended: number, medalsEarned: number, ringsEarned: number, bonusXp: number = 0): number {
  return eventsAttended * 100 + medalsEarned * 300 + ringsEarned * 1000 + bonusXp;
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
    memberSince: user.createdAt.toISOString(),
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

export default router;
