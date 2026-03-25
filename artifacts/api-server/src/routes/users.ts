import { Router, type IRouter } from "express";
import { db, usersTable, attendanceTable, eventsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router: IRouter = Router();

/* GET /api/users/:id/profile */
router.get("/:id/profile", async (req, res) => {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, Number(req.params.id)),
  });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const records = await db.query.attendanceTable.findMany({
    where: eq(attendanceTable.userId, user.id),
  });
  const eventsAttended = records.length;
  const medalsEarned = records.filter(r => r.earnedMedal).length;

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    memberSince: user.createdAt.toISOString(),
    eventsAttended,
    medalsEarned,
    avatarUrl: user.avatarUrl ?? null,
  });
});

/* GET /api/users/:id/attendance */
router.get("/:id/attendance", async (req, res) => {
  const records = await db.query.attendanceTable.findMany({
    where: eq(attendanceTable.userId, Number(req.params.id)),
    with: { event: true },
  });

  const result = records.map(r => ({
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
  const records = await db.query.attendanceTable.findMany({
    where: eq(attendanceTable.userId, Number(req.params.id)),
  });

  const eventsAttended = records.length;
  const medalsEarned = records.filter(r => r.earnedMedal).length;

  const all = [
    { id: "first_event", title: "First Timer", description: "Attended your first Dodge Club event", icon: "star", threshold: 1, type: "events" },
    { id: "five_events", title: "Regular", description: "Attended 5 events", icon: "award", threshold: 5, type: "events" },
    { id: "ten_events", title: "Veteran", description: "Attended 10 events", icon: "shield", threshold: 10, type: "events" },
    { id: "twenty_events", title: "Legend", description: "Attended 20 events", icon: "zap", threshold: 20, type: "events" },
    { id: "first_medal", title: "Medal Winner", description: "Earned your first medal", icon: "medal", threshold: 1, type: "medals" },
    { id: "five_medals", title: "Champion", description: "Earned 5 medals", icon: "trophy", threshold: 5, type: "medals" },
  ];

  const result = all.map(a => {
    const unlocked = a.type === "events"
      ? eventsAttended >= a.threshold
      : medalsEarned >= a.threshold;
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      icon: a.icon,
      unlocked,
      unlockedAt: unlocked ? new Date().toISOString() : null,
    };
  });

  res.json(result);
});

export default router;
