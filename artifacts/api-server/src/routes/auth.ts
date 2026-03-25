import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, attendanceTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router: IRouter = Router();

/* ---------- helpers ---------- */
function toProfile(user: typeof usersTable.$inferSelect, eventsAttended: number, medalsEarned: number) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    memberSince: user.createdAt.toISOString(),
    eventsAttended,
    medalsEarned,
    avatarUrl: user.avatarUrl ?? null,
  };
}

async function getUserStats(userId: number) {
  const attended = await db
    .select({ cnt: count() })
    .from(attendanceTable)
    .where(eq(attendanceTable.userId, userId));

  const eventsAttended = Number(attended[0]?.cnt ?? 0);

  const medalRows = await db.query.attendanceTable.findMany({
    where: (t, { eq, and }) => and(eq(t.userId, userId), eq(t.earnedMedal, true)),
  });

  return { eventsAttended, medalsEarned: medalRows.length };
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

  const { eventsAttended, medalsEarned } = await getUserStats(user.id);
  res.json(toProfile(user, eventsAttended, medalsEarned));
});

/* ---------- POST /api/auth/register ---------- */
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: "Missing required fields" });
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
  res.json({ user: toProfile(user, 0, 0), token: String(user.id) });
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

  const { eventsAttended, medalsEarned } = await getUserStats(user.id);
  req.session = { userId: user.id };
  res.json({ user: toProfile(user, eventsAttended, medalsEarned), token: String(user.id) });
});

/* ---------- POST /api/auth/logout ---------- */
router.post("/logout", (req, res) => {
  req.session = null;
  res.json({ message: "Logged out" });
});

export default router;
