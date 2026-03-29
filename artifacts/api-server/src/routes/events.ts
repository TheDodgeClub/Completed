import { Router, type IRouter } from "express";
import { db, eventsTable, attendanceTable, ticketsTable, usersTable, ticketTypesTable } from "@workspace/db";
import { eq, gte, desc, count, and, inArray, lte, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

// Check-in window: 30 min before start → 2 hrs after start
const CHECK_IN_BEFORE_MS = 30 * 60 * 1000;
const CHECK_IN_AFTER_MS = 2 * 60 * 60 * 1000;

function isCheckInWindowOpen(eventDate: Date): boolean {
  const now = Date.now();
  const start = eventDate.getTime() - CHECK_IN_BEFORE_MS;
  const end = eventDate.getTime() + CHECK_IN_AFTER_MS;
  return now >= start && now <= end;
}

// XP computation helpers (mirrors auth.ts / users.ts logic)
const ATTENDANCE_MILESTONES = [
  { events: 5,  bonus: 100  },
  { events: 10, bonus: 250  },
  { events: 25, bonus: 500  },
  { events: 50, bonus: 1000 },
];

function calcCheckInXP(
  attendedBefore: Set<number>,
  newEventId: number,
  chronoEvents: { id: number; xpReward: number }[],
): number {
  function sumXP(ids: Set<number>): number {
    let streak = 0, xp = 0, count = 0;
    for (const ev of chronoEvents) {
      if (ids.has(ev.id)) {
        streak++; count++;
        xp += (ev.xpReward ?? 50) + (streak >= 8 ? 50 : streak >= 4 ? 25 : streak >= 2 ? 10 : 0);
        for (const m of ATTENDANCE_MILESTONES) { if (count === m.events) { xp += m.bonus; break; } }
      } else { streak = 0; }
    }
    return xp;
  }
  const withNew = new Set([...attendedBefore, newEventId]);
  return sumXP(withNew) - sumXP(attendedBefore);
}

const router: IRouter = Router();

function toEvent(e: typeof eventsTable.$inferSelect, ticketTypes?: any[]) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date.toISOString(),
    location: e.location,
    ticketUrl: e.ticketUrl ?? null,
    imageUrl: e.imageUrl ?? null,
    isUpcoming: e.date > new Date(),
    isPublished: e.isPublished,
    attendeeCount: e.attendeeCount,
    ticketPrice: e.ticketPrice !== null && e.ticketPrice !== undefined ? Number(e.ticketPrice) : null,
    ticketCapacity: e.ticketCapacity ?? null,
    stripePriceId: e.stripePriceId ?? null,
    checkoutFields: (e.checkoutFields as any[]) ?? [],
    waiverText: e.waiverText ?? null,
    xpReward: e.xpReward ?? 50,
    ticketTypes: ticketTypes ?? [],
  };
}

async function getTicketTypesForEvents(eventIds: number[]) {
  if (eventIds.length === 0) return {};
  const types = await db.select().from(ticketTypesTable)
    .where(inArray(ticketTypesTable.eventId, eventIds))
    .orderBy(ticketTypesTable.sortOrder, ticketTypesTable.createdAt);
  const now = new Date();
  const byEvent: Record<number, any[]> = {};
  for (const t of types) {
    if (!byEvent[t.eventId]) byEvent[t.eventId] = [];
    const available = t.quantity === null ? null : Math.max(0, t.quantity - t.quantitySold);
    byEvent[t.eventId].push({
      id: t.id,
      name: t.name,
      description: t.description ?? null,
      price: t.price,
      quantity: t.quantity ?? null,
      quantitySold: t.quantitySold,
      available,
      isSoldOut: t.quantity !== null && t.quantitySold >= t.quantity,
      maxPerOrder: t.maxPerOrder ?? null,
      saleStartsAt: t.saleStartsAt?.toISOString() ?? null,
      saleEndsAt: t.saleEndsAt?.toISOString() ?? null,
      isActive: t.isActive,
      saleOpen: t.isActive &&
        (!t.saleStartsAt || now >= t.saleStartsAt) &&
        (!t.saleEndsAt || now <= t.saleEndsAt),
    });
  }
  return byEvent;
}

/* GET /api/events */
router.get("/", async (_req, res) => {
  const events = await db.select().from(eventsTable)
    .where(eq(eventsTable.isPublished, true))
    .orderBy(desc(eventsTable.date));
  const ids = events.map(e => e.id);
  const typesByEvent = await getTicketTypesForEvents(ids);
  res.json(events.map(e => toEvent(e, typesByEvent[e.id] ?? [])));
});

/* GET /api/events/upcoming */
router.get("/upcoming", async (_req, res) => {
  const now = new Date();
  const events = await db.select().from(eventsTable)
    .where(and(eq(eventsTable.isPublished, true), gte(eventsTable.date, now)));
  const ids = events.map(e => e.id);
  const typesByEvent = await getTicketTypesForEvents(ids);
  res.json(events.map(e => toEvent(e, typesByEvent[e.id] ?? [])));
});

/* GET /api/events/checkin-active — events currently in check-in window (admin, for scanner) */
/* MUST be registered before /:id to avoid Express matching "checkin-active" as an id param */
router.get("/checkin-active", requireAdmin, async (_req, res) => {
  const now = new Date();
  // Show events from 2 hrs ago up to 7 days ahead so staff can see & prep for upcoming events
  const rangeStart = new Date(now.getTime() - CHECK_IN_AFTER_MS);
  const rangeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const events = await db.select().from(eventsTable)
    .where(and(
      eq(eventsTable.isPublished, true),
      gte(eventsTable.date, rangeStart),
      lte(eventsTable.date, rangeEnd),
    ))
    .orderBy(eventsTable.date);
  res.json(events.map(e => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString(),
    location: e.location,
    checkInPin: e.checkInPin ?? null,
    checkInOpen: isCheckInWindowOpen(e.date),
  })));
});

/* GET /api/events/:id */
router.get("/:id", async (req, res) => {
  const event = await db.query.eventsTable.findFirst({
    where: eq(eventsTable.id, Number(req.params.id)),
  });
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  const typesByEvent = await getTicketTypesForEvents([event.id]);
  res.json(toEvent(event, typesByEvent[event.id] ?? []));
});

/* GET /api/events/:id/ticket-types */
router.get("/:id/ticket-types", async (req, res) => {
  const eventId = Number(req.params.id);
  const typesByEvent = await getTicketTypesForEvents([eventId]);
  res.json(typesByEvent[eventId] ?? []);
});

/* GET /api/events/:id/attendees */
router.get("/:id/attendees", async (req, res) => {
  const eventId = Number(req.params.id);
  const tickets = await db.select({ userId: ticketsTable.userId }).from(ticketsTable)
    .where(and(eq(ticketsTable.eventId, eventId), inArray(ticketsTable.status, ["paid", "free"])));
  if (tickets.length === 0) { res.json([]); return; }
  const userIds = tickets.map(t => t.userId);
  const users = await db.select({ id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl, accountType: usersTable.accountType })
    .from(usersTable).where(inArray(usersTable.id, userIds));
  res.json(users);
});

/* POST /api/events */
router.post("/", async (req, res) => {
  const { title, description, date, location, ticketUrl, imageUrl } = req.body;
  const [event] = await db.insert(eventsTable)
    .values({ title, description, date: new Date(date), location, ticketUrl, imageUrl })
    .returning();
  res.status(201).json(toEvent(event, []));
});

/* POST /api/events/:id/checkin — member PIN self check-in */
router.post("/:id/checkin", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorised" }); return; }

  const eventId = Number(req.params.id);
  const { pin } = req.body;

  const event = await db.query.eventsTable.findFirst({ where: eq(eventsTable.id, eventId) });
  if (!event || !event.isPublished) { res.status(404).json({ error: "Event not found" }); return; }

  if (!isCheckInWindowOpen(event.date)) {
    res.status(400).json({ error: "Check-in is not open for this event yet" }); return;
  }

  if (!event.checkInPin) {
    res.status(400).json({ error: "This event has no check-in PIN set" }); return;
  }

  if ((pin ?? "").trim().toUpperCase() !== event.checkInPin.trim().toUpperCase()) {
    res.status(400).json({ error: "Incorrect PIN" }); return;
  }

  // Idempotent — if already checked in return success
  const existing = await db.query.attendanceTable.findFirst({
    where: and(eq(attendanceTable.userId, userId), eq(attendanceTable.eventId, eventId)),
  });
  if (existing) { res.json({ alreadyCheckedIn: true, xpGained: 0 }); return; }

  // Compute accurate xpGained including streak + milestone bonuses
  const [attendanceRows, chronoEvents] = await Promise.all([
    db.select({ eventId: attendanceTable.eventId }).from(attendanceTable).where(eq(attendanceTable.userId, userId)),
    db.select({ id: eventsTable.id, xpReward: eventsTable.xpReward })
      .from(eventsTable)
      .where(lte(eventsTable.date, event.date))
      .orderBy(eventsTable.date),
  ]);
  const attendedBefore = new Set(attendanceRows.map(r => r.eventId));
  const xpGained = calcCheckInXP(attendedBefore, eventId, chronoEvents);

  await Promise.all([
    db.insert(attendanceTable).values({ userId, eventId, earnedMedal: false, checkinMethod: "pin" }),
    db.update(ticketsTable)
      .set({ checkedIn: true, checkedInAt: new Date() })
      .where(and(
        eq(ticketsTable.userId, userId),
        eq(ticketsTable.eventId, eventId),
        eq(ticketsTable.checkedIn, false),
      )),
    db.update(eventsTable)
      .set({ attendeeCount: sql`${eventsTable.attendeeCount} + 1` })
      .where(eq(eventsTable.id, eventId)),
  ]);
  res.json({ success: true, xpGained });
});

/* POST /api/events/:id/checkin-scan — scanner QR check-in (admin only) */
router.post("/:id/checkin-scan", requireAdmin, async (req, res) => {
  const eventId = Number(req.params.id);
  const { userId, ticketCode } = req.body;
  if (!userId && !ticketCode) { res.status(400).json({ error: "userId or ticketCode required" }); return; }

  // If scanning a ticket QR, look up the user via the ticket code
  let resolvedUserId: number;
  if (ticketCode) {
    const ticket = await db.query.ticketsTable.findFirst({
      where: and(eq(ticketsTable.ticketCode, String(ticketCode).toUpperCase()), eq(ticketsTable.eventId, eventId)),
      columns: { userId: true, status: true },
    });
    if (!ticket) { res.status(404).json({ error: "Ticket not found for this event" }); return; }
    if (ticket.status !== "paid") { res.status(400).json({ error: "Ticket is not valid (not paid)" }); return; }
    resolvedUserId = ticket.userId;
  } else {
    resolvedUserId = Number(userId);
  }

  const [event, user] = await Promise.all([
    db.query.eventsTable.findFirst({ where: eq(eventsTable.id, eventId) }),
    db.query.usersTable.findFirst({ where: eq(usersTable.id, resolvedUserId), columns: { id: true, name: true, avatarUrl: true, accountType: true } }),
  ]);
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  if (!user) { res.status(404).json({ error: "Member not found" }); return; }

  const existing = await db.query.attendanceTable.findFirst({
    where: and(eq(attendanceTable.userId, resolvedUserId), eq(attendanceTable.eventId, eventId)),
  });
  if (existing) {
    res.json({ alreadyCheckedIn: true, member: user, xpGained: 0 });
    return;
  }

  // Compute accurate xpGained including streak + milestone bonuses
  const [attendanceRows, chronoEvents] = await Promise.all([
    db.select({ eventId: attendanceTable.eventId }).from(attendanceTable).where(eq(attendanceTable.userId, resolvedUserId)),
    db.select({ id: eventsTable.id, xpReward: eventsTable.xpReward })
      .from(eventsTable)
      .where(lte(eventsTable.date, event.date))
      .orderBy(eventsTable.date),
  ]);
  const attendedBefore = new Set(attendanceRows.map(r => r.eventId));
  const xpGained = calcCheckInXP(attendedBefore, eventId, chronoEvents);

  // Insert attendance, tick ticket checkedIn, increment event attendeeCount — all in parallel
  await Promise.all([
    db.insert(attendanceTable).values({ userId: resolvedUserId, eventId, earnedMedal: false, checkinMethod: "scan" }),
    db.update(ticketsTable)
      .set({ checkedIn: true, checkedInAt: new Date() })
      .where(and(
        eq(ticketsTable.userId, resolvedUserId),
        eq(ticketsTable.eventId, eventId),
        eq(ticketsTable.checkedIn, false),
      )),
    db.update(eventsTable)
      .set({ attendeeCount: sql`${eventsTable.attendeeCount} + 1` })
      .where(eq(eventsTable.id, eventId)),
  ]);

  res.json({ success: true, member: user, xpGained });
});

/* GET /api/events/:id/checkin-stats — live check-in dashboard data (admin only) */
router.get("/:id/checkin-stats", requireAdmin, async (req, res) => {
  const eventId = Number(req.params.id);

  const [attendance, tickets] = await Promise.all([
    db.query.attendanceTable.findMany({
      where: eq(attendanceTable.eventId, eventId),
      with: { user: { columns: { id: true, name: true, avatarUrl: true } } },
      orderBy: [desc(attendanceTable.attendedAt)],
    }),
    db.select({ cnt: count() }).from(ticketsTable).where(
      and(
        eq(ticketsTable.eventId, eventId),
        inArray(ticketsTable.status, ["paid", "free"]),
      )
    ),
  ]);

  res.json({
    checkedIn: attendance.map(a => ({
      id: a.user.id,
      name: a.user.name,
      avatarUrl: a.user.avatarUrl ?? null,
      checkedInAt: a.attendedAt?.toISOString() ?? null,
    })),
    expectedCount: Number(tickets[0]?.cnt ?? 0),
  });
});

export default router;
