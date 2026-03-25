import { Router, type IRouter } from "express";
import { db, eventsTable, attendanceTable } from "@workspace/db";
import { eq, gte, desc, count } from "drizzle-orm";

const router: IRouter = Router();

function toEvent(e: typeof eventsTable.$inferSelect) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date.toISOString(),
    location: e.location,
    ticketUrl: e.ticketUrl ?? null,
    imageUrl: e.imageUrl ?? null,
    isUpcoming: e.date > new Date(),
    attendeeCount: e.attendeeCount,
  };
}

/* GET /api/events */
router.get("/", async (_req, res) => {
  const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.date));
  res.json(events.map(toEvent));
});

/* GET /api/events/upcoming */
router.get("/upcoming", async (_req, res) => {
  const now = new Date();
  const events = await db.select().from(eventsTable).where(gte(eventsTable.date, now));
  res.json(events.map(toEvent));
});

/* GET /api/events/:id */
router.get("/:id", async (req, res) => {
  const event = await db.query.eventsTable.findFirst({
    where: eq(eventsTable.id, Number(req.params.id)),
  });
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toEvent(event));
});

/* POST /api/events */
router.post("/", async (req, res) => {
  const { title, description, date, location, ticketUrl, imageUrl } = req.body;
  const [event] = await db
    .insert(eventsTable)
    .values({ title, description, date: new Date(date), location, ticketUrl, imageUrl })
    .returning();
  res.status(201).json(toEvent(event));
});

export default router;
