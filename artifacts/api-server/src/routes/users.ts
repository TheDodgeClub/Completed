import { Router, type IRouter } from "express";
import { db, usersTable, attendanceTable, eventsTable, awardsTable, teamHistoryTable, eventRegistrationsTable } from "@workspace/db";
import { eq, gt } from "drizzle-orm";

const router: IRouter = Router();

/* ---------- XP / Level helpers ---------- */

const LEVEL_THRESHOLDS = [0, 300, 700, 1200, 1800, 2500, 3300, 4200, 5200, 6300];

function computeXP(eventsAttended: number, medalsEarned: number, ringsEarned: number, bonusXp: number = 0, gameXp: number = 0): number {
  return eventsAttended * 100 + medalsEarned * 300 + ringsEarned * 1000 + bonusXp + gameXp;
}

function computeLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

function xpForNextLevel(xp: number): { current: number; next: number; level: number } {
  const level = computeLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return { current: xp - currentThreshold, next: nextThreshold - currentThreshold, level };
}

async function getUserStats(userId: number, bonusXp: number = 0, gameXp: number = 0) {
  const [records, awards] = await Promise.all([
    db.query.attendanceTable.findMany({ where: eq(attendanceTable.userId, userId) }),
    db.query.awardsTable.findMany({ where: eq(awardsTable.userId, userId) }),
  ]);
  const eventsAttended = records.length;
  const medalsEarned = records.filter(r => r.earnedMedal).length + awards.filter(a => a.type === "medal").length;
  const ringsEarned = awards.filter(a => a.type === "ring").length;
  const xp = computeXP(eventsAttended, medalsEarned, ringsEarned, bonusXp, gameXp);
  const level = computeLevel(xp);
  const xpProgress = xpForNextLevel(xp);
  return { eventsAttended, medalsEarned, ringsEarned, xp, level, xpProgress };
}

function toProfile(user: typeof usersTable.$inferSelect, stats: Awaited<ReturnType<typeof getUserStats>>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    memberSince: user.createdAt.toISOString(),
    avatarUrl: user.avatarUrl ?? null,
    username: user.username ?? null,
    preferredRole: user.preferredRole ?? null,
    bio: user.bio ?? null,
    ...stats,
  };
}

/* GET /api/users/leaderboard — top 5 members by XP */
router.get("/leaderboard", async (_req, res) => {
  const [users, allAttendance, allAwards] = await Promise.all([
    db.query.usersTable.findMany({
      columns: { id: true, name: true, avatarUrl: true, username: true, bonusXp: true, gameXp: true, isElite: true },
    }),
    db.query.attendanceTable.findMany({ columns: { userId: true } }),
    db.query.awardsTable.findMany({ columns: { userId: true, type: true } }),
  ]);

  const attendanceByUser = new Map<number, number>();
  for (const a of allAttendance) attendanceByUser.set(a.userId, (attendanceByUser.get(a.userId) ?? 0) + 1);

  const medalsByUser = new Map<number, number>();
  const ringsByUser = new Map<number, number>();
  for (const a of allAwards) {
    if (a.type === "medal") medalsByUser.set(a.userId, (medalsByUser.get(a.userId) ?? 0) + 1);
    if (a.type === "ring") ringsByUser.set(a.userId, (ringsByUser.get(a.userId) ?? 0) + 1);
  }

  const allUsers = users.map(u => ({
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    username: u.username ?? null,
    isElite: u.isElite ?? false,
    medals: medalsByUser.get(u.id) ?? 0,
    rings: ringsByUser.get(u.id) ?? 0,
    xp: computeXP(
      attendanceByUser.get(u.id) ?? 0,
      medalsByUser.get(u.id) ?? 0,
      ringsByUser.get(u.id) ?? 0,
      u.bonusXp ?? 0,
      u.gameXp ?? 0,
    ),
  }));

  const topXp = [...allUsers].sort((a, b) => b.xp - a.xp).slice(0, 5);
  const topMedals = [...allUsers].sort((a, b) => b.medals - a.medals).filter(u => u.medals > 0).slice(0, 5);
  const hallOfFame = [...allUsers].sort((a, b) => b.rings - a.rings).filter(u => u.rings > 0).slice(0, 5);

  res.json({ xp: topXp, medals: topMedals, hallOfFame });
});

/* GET /api/users — member directory (public) */
router.get("/", async (_req, res) => {
  const users = await db.query.usersTable.findMany({
    orderBy: usersTable.name,
    columns: { id: true, name: true, avatarUrl: true, username: true, bio: true, preferredRole: true, createdAt: true, isElite: true },
  });
  res.json(users.map(u => ({
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    username: u.username ?? null,
    bio: u.bio ?? null,
    preferredRole: u.preferredRole ?? null,
    memberSince: u.createdAt.toISOString(),
    isElite: u.isElite ?? false,
  })));
});

/* GET /api/users/:id/profile */
router.get("/:id/profile", async (req, res) => {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, Number(req.params.id)) });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  const stats = await getUserStats(user.id, user.bonusXp ?? 0, user.gameXp ?? 0);
  res.json(toProfile(user, stats));
});

/* GET /api/users/:id/attendance */
router.get("/:id/attendance", async (req, res) => {
  const records = await db.query.attendanceTable.findMany({
    where: eq(attendanceTable.userId, Number(req.params.id)),
    with: { event: true },
  });

  const result = records
    .filter(r => !r.event.date || r.event.date <= new Date())
    .sort((a, b) => b.event.date.getTime() - a.event.date.getTime())
    .map(r => ({
      id: r.id,
      userId: r.userId,
      eventId: r.eventId,
      earnedMedal: r.earnedMedal,
      attendedAt: r.attendedAt.toISOString(),
      event: {
        id: r.event.id,
        title: r.event.title,
        description: r.event.description,
        date: r.event.date.toISOString(),
        location: r.event.location,
        ticketUrl: r.event.ticketUrl ?? null,
        imageUrl: r.event.imageUrl ?? null,
        isUpcoming: r.event.date > new Date(),
        attendeeCount: r.event.attendeeCount,
      },
    }));

  res.json(result);
});

/* GET /api/users/:id/achievements */
router.get("/:id/achievements", async (req, res) => {
  const records = await db.query.attendanceTable.findMany({ where: eq(attendanceTable.userId, Number(req.params.id)) });
  const awards = await db.query.awardsTable.findMany({ where: eq(awardsTable.userId, Number(req.params.id)) });
  const eventsAttended = records.length;
  const medalsEarned = records.filter(r => r.earnedMedal).length + awards.filter(a => a.type === "medal").length;

  const all = [
    { id: "first_event", title: "First Timer", description: "Attended your first Dodge Club event", icon: "star", threshold: 1, type: "events" },
    { id: "five_events", title: "Regular", description: "Attended 5 events", icon: "award", threshold: 5, type: "events" },
    { id: "ten_events", title: "Veteran", description: "Attended 10 events", icon: "shield", threshold: 10, type: "events" },
    { id: "twenty_events", title: "Legend", description: "Attended 20 events", icon: "zap", threshold: 20, type: "events" },
    { id: "first_medal", title: "Medal Winner", description: "Earned your first medal", icon: "medal", threshold: 1, type: "medals" },
    { id: "five_medals", title: "Champion", description: "Earned 5 medals", icon: "trophy", threshold: 5, type: "medals" },
  ];

  const result = all.map(a => {
    const unlocked = a.type === "events" ? eventsAttended >= a.threshold : medalsEarned >= a.threshold;
    return { id: a.id, title: a.title, description: a.description, icon: a.icon, unlocked, unlockedAt: unlocked ? new Date().toISOString() : null };
  });

  res.json(result);
});

/* GET /api/users/:id/team-history */
router.get("/:id/team-history", async (req, res) => {
  const history = await db.query.teamHistoryTable.findMany({
    where: eq(teamHistoryTable.userId, Number(req.params.id)),
  });
  res.json(history.map(h => ({
    id: h.id,
    teamName: h.teamName,
    season: h.season,
    roleInTeam: h.roleInTeam ?? null,
    notes: h.notes ?? null,
    createdAt: h.createdAt.toISOString(),
  })));
});

/* GET /api/users/:id/upcoming-events */
router.get("/:id/upcoming-events", async (req, res) => {
  const registrations = await db.query.eventRegistrationsTable.findMany({
    where: eq(eventRegistrationsTable.userId, Number(req.params.id)),
    with: { event: true },
  });
  const now = new Date();
  const upcoming = registrations
    .filter(r => r.event.date > now && r.event.isPublished)
    .sort((a, b) => a.event.date.getTime() - b.event.date.getTime())
    .map(r => ({
      id: r.event.id,
      title: r.event.title,
      date: r.event.date.toISOString(),
      location: r.event.location,
      imageUrl: r.event.imageUrl ?? null,
    }));
  res.json(upcoming);
});

/* PUT /api/users/me — update own profile (requires auth) */
router.put("/me", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { name, username, bio, preferredRole } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (username !== undefined) updates.username = username || null;
  if (bio !== undefined) updates.bio = bio || null;
  if (preferredRole !== undefined) updates.preferredRole = preferredRole || null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  if (username) {
    const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.username, username) });
    if (existing && existing.id !== userId) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
  }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const stats = await getUserStats(user.id, user.bonusXp ?? 0, user.gameXp ?? 0);
  res.json(toProfile(user, stats));
});

/* POST /api/users/me/game-xp — award XP for completing a mini game */
router.post("/me/game-xp", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const earned = Number(req.body.earned);
  if (isNaN(earned) || earned < 0 || earned > 50) {
    res.status(400).json({ error: "Invalid XP amount" });
    return;
  }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const MAX_GAME_XP = 500;
  const current = user.gameXp ?? 0;
  const toAdd = Math.max(0, Math.min(earned, MAX_GAME_XP - current));

  if (toAdd > 0) {
    await db.update(usersTable).set({ gameXp: current + toAdd }).where(eq(usersTable.id, userId));
  }

  res.json({ added: toAdd, totalGameXp: current + toAdd });
});

/* POST /api/users/me/avatar — update avatar URL */
router.post("/me/avatar", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { avatarUrl } = req.body;
  if (!avatarUrl) { res.status(400).json({ error: "avatarUrl is required" }); return; }

  const [user] = await db.update(usersTable).set({ avatarUrl }).where(eq(usersTable.id, userId)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  res.json({ avatarUrl: user.avatarUrl });
});

/* POST /api/users/me/register — register for an event */
router.post("/me/register", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { eventId } = req.body;
  if (!eventId) { res.status(400).json({ error: "eventId required" }); return; }

  try {
    const [reg] = await db.insert(eventRegistrationsTable)
      .values({ userId, eventId: Number(eventId) })
      .returning();
    res.status(201).json({ id: reg.id, eventId: reg.eventId, registeredAt: reg.registeredAt.toISOString() });
  } catch {
    res.status(409).json({ error: "Already registered" });
  }
});

/* DELETE /api/users/me/register/:eventId — unregister from an event */
router.delete("/me/register/:eventId", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db.delete(eventRegistrationsTable).where(
    eq(eventRegistrationsTable.userId, userId)
  );
  res.json({ ok: true });
});

/* GET /api/users/me/notification-status */
router.get("/me/notification-status", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  res.json({ notificationsEnabled: user.notificationsEnabled ?? false });
});

/* POST /api/users/me/push-token — save/update Expo push token */
router.post("/me/push-token", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { pushToken } = req.body;
  if (!pushToken || typeof pushToken !== "string") {
    res.status(400).json({ error: "pushToken is required" });
    return;
  }

  await db.update(usersTable).set({ pushToken }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

/* PUT /api/users/me/notifications — toggle notifications on/off */
router.put("/me/notifications", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled (boolean) is required" });
    return;
  }

  await db.update(usersTable)
    .set({ notificationsEnabled: enabled })
    .where(eq(usersTable.id, userId));

  res.json({ notificationsEnabled: enabled });
});

export default router;
