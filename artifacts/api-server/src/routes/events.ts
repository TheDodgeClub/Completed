import { Router, type IRouter } from "express";
import { db, eventsTable, attendanceTable, ticketsTable, usersTable, ticketTypesTable } from "@workspace/db";
import { eq, gte, desc, count, and, inArray } from "drizzle-orm";

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

export default router;
