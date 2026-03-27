import { Router, type IRouter } from "express";
import { db, usersTable, attendanceTable, eventsTable, awardsTable, eventRegistrationsTable, postCommentsTable, postsTable } from "@workspace/db";
import { eq, gt, desc, lte, isNotNull } from "drizzle-orm";

const router: IRouter = Router();

/* ---------- XP / Level helpers ---------- */

const LEVEL_THRESHOLDS = [0, 300, 800, 1600, 2500, 5000, 10000, 20000, 40000, 80000];

const ATTENDANCE_MILESTONES = [
  { events: 5,  bonus: 100  },
  { events: 10, bonus: 250  },
  { events: 25, bonus: 500  },
  { events: 50, bonus: 1000 },
];

function computeAttendanceXP(
  attendedEventIds: Set<number>,
  pastEvents: { id: number; xpReward: number }[],
): { eventXP: number; currentStreak: number; bestStreak: number; eventsAttended: number } {
  let streak = 0;
  let bestStreak = 0;
  let eventXP = 0;
  let attendedCount = 0;
  for (const event of pastEvents) {
    if (attendedEventIds.has(event.id)) {
      streak++;
      attendedCount++;
      const streakBonus = streak >= 8 ? 50 : streak >= 4 ? 25 : streak >= 2 ? 10 : 0;
      eventXP += (event.xpReward ?? 50) + streakBonus;
      for (const m of ATTENDANCE_MILESTONES) {
        if (attendedCount === m.events) { eventXP += m.bonus; break; }
      }
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
    }
  }
  return { eventXP, currentStreak: streak, bestStreak, eventsAttended: attendedCount };
}

function computeXP(eventXP: number, medalsEarned: number, ringsEarned: number, bonusXp: number = 0, gameXp: number = 0, isElite: boolean = false): number {
  return eventXP + medalsEarned * 300 + ringsEarned * 1000 + bonusXp + gameXp + (isElite ? 500 : 0);
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

async function getUserStats(userId: number, bonusXp: number = 0, gameXp: number = 0, isElite: boolean = false) {
  const [records, awards, pastEvents] = await Promise.all([
    db.query.attendanceTable.findMany({ where: eq(attendanceTable.userId, userId) }),
    db.query.awardsTable.findMany({ where: eq(awardsTable.userId, userId) }),
    db.select({ id: eventsTable.id, xpReward: eventsTable.xpReward }).from(eventsTable).where(lte(eventsTable.date, new Date())).orderBy(eventsTable.date),
  ]);
  const attendedIds = new Set(records.map(r => r.eventId));
  const { eventXP, currentStreak, bestStreak, eventsAttended } = computeAttendanceXP(attendedIds, pastEvents);
  const medalsEarned = records.filter(r => r.earnedMedal).length + awards.filter(a => a.type === "medal").length;
  const ringsEarned = awards.filter(a => a.type === "ring").length;
  const xp = computeXP(eventXP, medalsEarned, ringsEarned, bonusXp, gameXp, isElite);
  const level = computeLevel(xp);
  const xpProgress = xpForNextLevel(xp);
  return { eventsAttended, medalsEarned, ringsEarned, xp, level, xpProgress, currentStreak, bestStreak };
}

function toProfile(user: typeof usersTable.$inferSelect, stats: Awaited<ReturnType<typeof getUserStats>>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    accountType: user.accountType ?? "player",
    isElite: user.isElite ?? false,
    memberSince: (user.memberSince ?? user.createdAt).toISOString(),
    avatarUrl: user.avatarUrl ?? null,
    username: user.username ?? null,
    preferredRole: user.preferredRole ?? null,
    bio: user.bio ?? null,
    ...stats,
  };
}

/* GET /api/users/leaderboard — top 5 members by XP */
router.get("/leaderboard", async (_req, res) => {
  const [users, allAttendance, allAwards, pastEvents] = await Promise.all([
    db.query.usersTable.findMany({
      columns: { id: true, name: true, avatarUrl: true, username: true, bonusXp: true, gameXp: true, isElite: true, isAdmin: true },
      where: eq(usersTable.isAdmin, false),
    }),
    db.query.attendanceTable.findMany({ columns: { userId: true, eventId: true, earnedMedal: true } }),
    db.query.awardsTable.findMany({ columns: { userId: true, type: true } }),
    db.select({ id: eventsTable.id, xpReward: eventsTable.xpReward }).from(eventsTable).where(lte(eventsTable.date, new Date())).orderBy(eventsTable.date),
  ]);

  const attendanceEventsByUser = new Map<number, Set<number>>();
  const attendanceMedalsByUser = new Map<number, number>();
  for (const a of allAttendance) {
    if (!attendanceEventsByUser.has(a.userId)) attendanceEventsByUser.set(a.userId, new Set());
    attendanceEventsByUser.get(a.userId)!.add(a.eventId);
    if (a.earnedMedal) attendanceMedalsByUser.set(a.userId, (attendanceMedalsByUser.get(a.userId) ?? 0) + 1);
  }

  const awardMedalsByUser = new Map<number, number>();
  const ringsByUser = new Map<number, number>();
  for (const a of allAwards) {
    if (a.type === "medal") awardMedalsByUser.set(a.userId, (awardMedalsByUser.get(a.userId) ?? 0) + 1);
    if (a.type === "ring") ringsByUser.set(a.userId, (ringsByUser.get(a.userId) ?? 0) + 1);
  }

  const allUserIds = new Set([...attendanceMedalsByUser.keys(), ...awardMedalsByUser.keys()]);
  const medalsByUser = new Map<number, number>();
  for (const uid of allUserIds) {
    medalsByUser.set(uid, (attendanceMedalsByUser.get(uid) ?? 0) + (awardMedalsByUser.get(uid) ?? 0));
  }

  const allUsers = users.map(u => {
    const { eventXP } = computeAttendanceXP(attendanceEventsByUser.get(u.id) ?? new Set(), pastEvents);
    const medals = medalsByUser.get(u.id) ?? 0;
    const rings = ringsByUser.get(u.id) ?? 0;
    return {
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl ?? null,
      username: u.username ?? null,
      isElite: u.isElite ?? false,
      medals,
      rings,
      xp: computeXP(eventXP, medals, rings, u.bonusXp ?? 0, u.gameXp ?? 0, u.isElite ?? false),
    };
  });

  const topXp = [...allUsers].sort((a, b) => b.xp - a.xp).slice(0, 5);
  const topMedals = [...allUsers].sort((a, b) => b.medals - a.medals).filter(u => u.medals > 0).slice(0, 5);
  const topRings = [...allUsers].sort((a, b) => b.rings - a.rings).filter(u => u.rings > 0).slice(0, 5);

  res.json({ xp: topXp, medals: topMedals, rings: topRings });
});

/* GET /api/users/me/rank — authenticated user's XP rank among all members */
router.get("/me/rank", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [users, allAttendance, allAwards, pastEvents] = await Promise.all([
    db.query.usersTable.findMany({
      columns: { id: true, bonusXp: true, gameXp: true, isElite: true, isAdmin: true },
      where: eq(usersTable.isAdmin, false),
    }),
    db.query.attendanceTable.findMany({ columns: { userId: true, eventId: true, earnedMedal: true } }),
    db.query.awardsTable.findMany({ columns: { userId: true, type: true } }),
    db.select({ id: eventsTable.id, xpReward: eventsTable.xpReward }).from(eventsTable).where(lte(eventsTable.date, new Date())).orderBy(eventsTable.date),
  ]);

  const attendanceEventsByUser = new Map<number, Set<number>>();
  const attendanceMedalsByUser = new Map<number, number>();
  for (const a of allAttendance) {
    if (!attendanceEventsByUser.has(a.userId)) attendanceEventsByUser.set(a.userId, new Set());
    attendanceEventsByUser.get(a.userId)!.add(a.eventId);
    if (a.earnedMedal) attendanceMedalsByUser.set(a.userId, (attendanceMedalsByUser.get(a.userId) ?? 0) + 1);
  }
  const awardMedalsByUser = new Map<number, number>();
  const ringsByUser = new Map<number, number>();
  for (const a of allAwards) {
    if (a.type === "medal") awardMedalsByUser.set(a.userId, (awardMedalsByUser.get(a.userId) ?? 0) + 1);
    if (a.type === "ring") ringsByUser.set(a.userId, (ringsByUser.get(a.userId) ?? 0) + 1);
  }

  const allUsers = users.map(u => {
    const { eventXP } = computeAttendanceXP(attendanceEventsByUser.get(u.id) ?? new Set(), pastEvents);
    const medals = (attendanceMedalsByUser.get(u.id) ?? 0) + (awardMedalsByUser.get(u.id) ?? 0);
    const rings = ringsByUser.get(u.id) ?? 0;
    return { id: u.id, xp: computeXP(eventXP, medals, rings, u.bonusXp ?? 0, u.gameXp ?? 0, u.isElite ?? false) };
  });

  const sortedByXp = [...allUsers].sort((a, b) => b.xp - a.xp);
  const xpRank = sortedByXp.findIndex(u => u.id === userId) + 1;

  res.json({ xpRank: xpRank > 0 ? xpRank : null, totalMembers: users.length });
});

/* GET /api/users/activity — recent community activity feed (public) */
router.get("/activity", async (_req, res) => {
  const [
    recentAwards,
    recentMembers,
    recentRegistrations,
    eliteUpgrades,
    recentComments,
    recentAttendance,
    recentPosts,
    referredMembers,
  ] = await Promise.all([
    db.query.awardsTable.findMany({
      with: { user: { columns: { id: true, name: true, avatarUrl: true, accountType: true, isElite: true } } },
      orderBy: [desc(awardsTable.awardedAt)],
      limit: 8,
    }),
    db.query.usersTable.findMany({
      columns: { id: true, name: true, avatarUrl: true, createdAt: true, isAdmin: true, accountType: true, isElite: true, referredBy: true },
      orderBy: [desc(usersTable.createdAt)],
      limit: 8,
    }),
    db.query.eventRegistrationsTable.findMany({
      with: {
        user: { columns: { id: true, name: true, avatarUrl: true, accountType: true, isElite: true } },
        event: { columns: { title: true } },
      },
      orderBy: [desc(eventRegistrationsTable.registeredAt)],
      limit: 8,
    }),
    db.query.usersTable.findMany({
      columns: { id: true, name: true, avatarUrl: true, eliteSince: true, accountType: true },
      where: isNotNull(usersTable.eliteSince),
      orderBy: [desc(usersTable.eliteSince)],
      limit: 6,
    }),
    db.query.postCommentsTable.findMany({
      with: {
        user: { columns: { id: true, name: true, avatarUrl: true, accountType: true, isElite: true } },
        post: { columns: { title: true } },
      },
      orderBy: [desc(postCommentsTable.createdAt)],
      limit: 8,
    }),
    db.query.attendanceTable.findMany({
      with: {
        user: { columns: { id: true, name: true, avatarUrl: true, accountType: true, isElite: true } },
        event: { columns: { title: true } },
      },
      orderBy: [desc(attendanceTable.attendedAt)],
      limit: 10,
    }),
    db.query.postsTable.findMany({
      with: {
        author: { columns: { id: true, name: true, avatarUrl: true, accountType: true, isElite: true } },
      },
      orderBy: [desc(postsTable.createdAt)],
      limit: 6,
    }),
    db.query.usersTable.findMany({
      columns: { id: true, name: true, avatarUrl: true, createdAt: true, accountType: true, isElite: true, referredBy: true },
      where: isNotNull(usersTable.referredBy),
      orderBy: [desc(usersTable.createdAt)],
      limit: 6,
    }),
  ]);

  const items: Array<{
    id: string; type: string; userId: number; userName: string;
    userAvatar: string | null; text: string; timestamp: string;
    accountType: "player" | "supporter"; isElite: boolean;
  }> = [];

  for (const award of recentAwards) {
    items.push({
      id: `award-${award.id}`,
      type: award.type,
      userId: award.userId,
      userName: award.user.name,
      userAvatar: award.user.avatarUrl ?? null,
      text: award.type === "ring"
        ? `${award.user.name} earned a Ring 💍`
        : `${award.user.name} earned a Medal 🏅`,
      timestamp: award.awardedAt.toISOString(),
      accountType: (award.user.accountType ?? "player") as "player" | "supporter",
      isElite: award.user.isElite ?? false,
    });
  }

  // Split new members into referred vs organic joins
  const referredIds = new Set(referredMembers.map(m => m.id));
  for (const member of recentMembers.filter(m => !m.isAdmin && !referredIds.has(m.id))) {
    items.push({
      id: `member-${member.id}`,
      type: "newMember",
      userId: member.id,
      userName: member.name,
      userAvatar: member.avatarUrl ?? null,
      text: `${member.name} just joined the Dodge Club 👋`,
      timestamp: member.createdAt.toISOString(),
      accountType: (member.accountType ?? "player") as "player" | "supporter",
      isElite: member.isElite ?? false,
    });
  }

  for (const reg of recentRegistrations) {
    items.push({
      id: `reg-${reg.id}`,
      type: "ticket",
      userId: reg.userId,
      userName: reg.user.name,
      userAvatar: reg.user.avatarUrl ?? null,
      text: `${reg.user.name} grabbed tickets to ${reg.event.title} 🎟️`,
      timestamp: reg.registeredAt.toISOString(),
      accountType: (reg.user.accountType ?? "player") as "player" | "supporter",
      isElite: reg.user.isElite ?? false,
    });
  }

  for (const u of eliteUpgrades) {
    if (!u.eliteSince) continue;
    items.push({
      id: `elite-${u.id}`,
      type: "elite",
      userId: u.id,
      userName: u.name,
      userAvatar: u.avatarUrl ?? null,
      text: `${u.name} went Elite ⚡`,
      timestamp: u.eliteSince.toISOString(),
      accountType: (u.accountType ?? "player") as "player" | "supporter",
      isElite: true,
    });
  }

  for (const comment of recentComments) {
    items.push({
      id: `comment-${comment.id}`,
      type: "comment",
      userId: comment.userId,
      userName: comment.user.name,
      userAvatar: comment.user.avatarUrl ?? null,
      text: `${comment.user.name} commented on "${comment.post.title}" 💬`,
      timestamp: comment.createdAt.toISOString(),
      accountType: (comment.user.accountType ?? "player") as "player" | "supporter",
      isElite: comment.user.isElite ?? false,
    });
  }

  for (const record of recentAttendance) {
    items.push({
      id: `attendance-${record.id}`,
      type: "attendance",
      userId: record.userId,
      userName: record.user.name,
      userAvatar: record.user.avatarUrl ?? null,
      text: record.earnedMedal
        ? `${record.user.name} attended ${record.event.title} and earned a medal 🏅`
        : `${record.user.name} showed up to ${record.event.title} 🎯`,
      timestamp: record.attendedAt.toISOString(),
      accountType: (record.user.accountType ?? "player") as "player" | "supporter",
      isElite: record.user.isElite ?? false,
    });
  }

  for (const post of recentPosts) {
    items.push({
      id: `post-${post.id}`,
      type: "post",
      userId: post.author.id,
      userName: post.author.name,
      userAvatar: post.author.avatarUrl ?? null,
      text: `New post: "${post.title}" 📢`,
      timestamp: post.createdAt.toISOString(),
      accountType: (post.author.accountType ?? "player") as "player" | "supporter",
      isElite: post.author.isElite ?? false,
    });
  }

  for (const member of referredMembers) {
    items.push({
      id: `referral-${member.id}`,
      type: "referral",
      userId: member.id,
      userName: member.name,
      userAvatar: member.avatarUrl ?? null,
      text: `${member.name} joined via a referral 🤝`,
      timestamp: member.createdAt.toISOString(),
      accountType: (member.accountType ?? "player") as "player" | "supporter",
      isElite: member.isElite ?? false,
    });
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(items.slice(0, 12));
});

/* GET /api/users — member directory (public) */
router.get("/", async (_req, res) => {
  const users = await db.query.usersTable.findMany({
    orderBy: usersTable.name,
    columns: { id: true, name: true, avatarUrl: true, username: true, bio: true, preferredRole: true, createdAt: true, isElite: true, accountType: true },
  });
  res.json(users.map(u => ({
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    username: u.username ?? null,
    bio: u.bio ?? null,
    preferredRole: u.preferredRole ?? null,
    memberSince: (u.memberSince ?? u.createdAt).toISOString(),
    isElite: u.isElite ?? false,
    accountType: u.accountType ?? "player",
  })));
});

/* GET /api/users/:id/profile */
router.get("/:id/profile", async (req, res) => {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, Number(req.params.id)) });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  const stats = await getUserStats(user.id, user.bonusXp ?? 0, user.gameXp ?? 0, user.isElite ?? false);
  res.json(toProfile(user, stats));
});

/* GET /api/users/:id/attendance */
router.get("/:id/attendance", async (req, res) => {
  const userId = Number(req.params.id);
  const [records, pastEvents] = await Promise.all([
    db.query.attendanceTable.findMany({
      where: eq(attendanceTable.userId, userId),
      with: { event: true },
    }),
    db.select({ id: eventsTable.id, xpReward: eventsTable.xpReward }).from(eventsTable).where(lte(eventsTable.date, new Date())).orderBy(eventsTable.date),
  ]);

  // Compute per-event XP (same streak/milestone algorithm used in getUserStats)
  const attendedIds = new Set(records.map(r => r.eventId));
  const xpByEventId = new Map<number, { xpEarned: number; streakAt: number; milestoneBonus: number }>();
  let streak = 0;
  let attendedCount = 0;
  for (const ev of pastEvents) {
    if (attendedIds.has(ev.id)) {
      streak++;
      attendedCount++;
      const streakBonus = streak >= 8 ? 50 : streak >= 4 ? 25 : streak >= 2 ? 10 : 0;
      let milestoneBonus = 0;
      for (const m of ATTENDANCE_MILESTONES) { if (attendedCount === m.events) { milestoneBonus = m.bonus; break; } }
      xpByEventId.set(ev.id, { xpEarned: (ev.xpReward ?? 50) + streakBonus + milestoneBonus, streakAt: streak, milestoneBonus });
    } else {
      streak = 0;
    }
  }

  const result = records
    .filter(r => !r.event.date || r.event.date <= new Date())
    .sort((a, b) => b.event.date.getTime() - a.event.date.getTime())
    .map(r => {
      const xpData = xpByEventId.get(r.eventId) ?? { xpEarned: 50, streakAt: 1, milestoneBonus: 0 };
      return {
        id: r.id,
        userId: r.userId,
        eventId: r.eventId,
        earnedMedal: r.earnedMedal,
        attendedAt: r.attendedAt.toISOString(),
        xpEarned: xpData.xpEarned,
        streakAt: xpData.streakAt,
        milestoneBonus: xpData.milestoneBonus,
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
      };
    });

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
    const current = a.type === "events" ? eventsAttended : medalsEarned;
    const unlocked = current >= a.threshold;
    return {
      id: a.id, title: a.title, description: a.description, icon: a.icon,
      unlocked, unlockedAt: unlocked ? new Date().toISOString() : null,
      current: Math.min(current, a.threshold), threshold: a.threshold,
    };
  });

  res.json(result);
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
      xpReward: r.event.xpReward ?? 50,
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

  const stats = await getUserStats(user.id, user.bonusXp ?? 0, user.gameXp ?? 0, user.isElite ?? false);
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
