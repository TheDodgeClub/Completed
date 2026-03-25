import { Router, type IRouter } from "express";
import { db, eventsTable, postsTable, merchTable, usersTable, attendanceTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.use(requireAdmin);

/* ========== EVENTS ========== */

/* GET /api/admin/events — list all events (incl past) */
router.get("/events", async (_req, res) => {
  const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.date));
  res.json(events.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date.toISOString(),
    location: e.location,
    ticketUrl: e.ticketUrl ?? null,
    imageUrl: e.imageUrl ?? null,
    isUpcoming: e.date > new Date(),
    attendeeCount: e.attendeeCount,
  })));
});

/* POST /api/admin/events — create */
router.post("/events", async (req, res) => {
  const { title, description, date, location, ticketUrl, imageUrl } = req.body;
  const [event] = await db.insert(eventsTable)
    .values({ title, description, date: new Date(date), location, ticketUrl: ticketUrl || null, imageUrl: imageUrl || null })
    .returning();
  res.status(201).json({
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date.toISOString(),
    location: event.location,
    ticketUrl: event.ticketUrl ?? null,
    imageUrl: event.imageUrl ?? null,
    isUpcoming: event.date > new Date(),
    attendeeCount: event.attendeeCount,
  });
});

/* PUT /api/admin/events/:id — update */
router.put("/events/:id", async (req, res) => {
  const { title, description, date, location, ticketUrl, imageUrl } = req.body;
  const [event] = await db.update(eventsTable)
    .set({ title, description, date: date ? new Date(date) : undefined, location, ticketUrl: ticketUrl || null, imageUrl: imageUrl || null })
    .where(eq(eventsTable.id, Number(req.params.id)))
    .returning();
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date.toISOString(),
    location: event.location,
    ticketUrl: event.ticketUrl ?? null,
    imageUrl: event.imageUrl ?? null,
    isUpcoming: event.date > new Date(),
    attendeeCount: event.attendeeCount,
  });
});

/* DELETE /api/admin/events/:id */
router.delete("/events/:id", async (req, res) => {
  await db.delete(attendanceTable).where(eq(attendanceTable.eventId, Number(req.params.id)));
  await db.delete(eventsTable).where(eq(eventsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* ========== POSTS ========== */

/* GET /api/admin/posts — list all */
router.get("/posts", async (_req, res) => {
  const posts = await db.query.postsTable.findMany({
    orderBy: desc(postsTable.createdAt),
    with: { author: true },
  });
  res.json(posts.map(p => ({
    id: p.id,
    title: p.title,
    content: p.content,
    imageUrl: p.imageUrl ?? null,
    createdAt: p.createdAt.toISOString(),
    authorName: p.author.name,
    isMembersOnly: p.isMembersOnly,
  })));
});

/* POST /api/admin/posts — create */
router.post("/posts", async (req, res) => {
  const { title, content, imageUrl, isMembersOnly } = req.body;
  const [post] = await db.insert(postsTable)
    .values({ title, content, imageUrl: imageUrl || null, isMembersOnly: !!isMembersOnly, authorId: req.session!.userId })
    .returning();
  const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, post.authorId) });
  res.status(201).json({
    id: post.id,
    title: post.title,
    content: post.content,
    imageUrl: post.imageUrl ?? null,
    createdAt: post.createdAt.toISOString(),
    authorName: author?.name ?? "Admin",
    isMembersOnly: post.isMembersOnly,
  });
});

/* PUT /api/admin/posts/:id — update */
router.put("/posts/:id", async (req, res) => {
  const { title, content, imageUrl, isMembersOnly } = req.body;
  const [post] = await db.update(postsTable)
    .set({ title, content, imageUrl: imageUrl || null, isMembersOnly: !!isMembersOnly })
    .where(eq(postsTable.id, Number(req.params.id)))
    .returning();
  if (!post) { res.status(404).json({ error: "Not found" }); return; }
  const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, post.authorId) });
  res.json({
    id: post.id,
    title: post.title,
    content: post.content,
    imageUrl: post.imageUrl ?? null,
    createdAt: post.createdAt.toISOString(),
    authorName: author?.name ?? "Admin",
    isMembersOnly: post.isMembersOnly,
  });
});

/* DELETE /api/admin/posts/:id */
router.delete("/posts/:id", async (req, res) => {
  await db.delete(postsTable).where(eq(postsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* ========== MERCH ========== */

/* GET /api/admin/merch — list all */
router.get("/merch", async (_req, res) => {
  const products = await db.select().from(merchTable);
  res.json(products.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    imageUrl: p.imageUrl ?? null,
    buyUrl: p.buyUrl ?? null,
    category: p.category,
    inStock: p.inStock,
  })));
});

/* POST /api/admin/merch — create */
router.post("/merch", async (req, res) => {
  const { name, description, price, imageUrl, buyUrl, category, inStock } = req.body;
  const [product] = await db.insert(merchTable)
    .values({ name, description, price: String(price), imageUrl: imageUrl || null, buyUrl: buyUrl || null, category: category || "apparel", inStock: inStock !== false })
    .returning();
  res.status(201).json({
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    imageUrl: product.imageUrl ?? null,
    buyUrl: product.buyUrl ?? null,
    category: product.category,
    inStock: product.inStock,
  });
});

/* PUT /api/admin/merch/:id — update */
router.put("/merch/:id", async (req, res) => {
  const { name, description, price, imageUrl, buyUrl, category, inStock } = req.body;
  const [product] = await db.update(merchTable)
    .set({ name, description, price: price !== undefined ? String(price) : undefined, imageUrl: imageUrl || null, buyUrl: buyUrl || null, category, inStock: inStock !== false })
    .where(eq(merchTable.id, Number(req.params.id)))
    .returning();
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    imageUrl: product.imageUrl ?? null,
    buyUrl: product.buyUrl ?? null,
    category: product.category,
    inStock: product.inStock,
  });
});

/* DELETE /api/admin/merch/:id */
router.delete("/merch/:id", async (req, res) => {
  await db.delete(merchTable).where(eq(merchTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* ========== MEMBERS ========== */

/* GET /api/admin/members — list all users */
router.get("/members", async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(usersTable.name);
  const result = await Promise.all(users.map(async (u) => {
    const records = await db.select().from(attendanceTable).where(eq(attendanceTable.userId, u.id));
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin,
      memberSince: u.createdAt.toISOString(),
      eventsAttended: records.length,
      medalsEarned: records.filter(r => r.earnedMedal).length,
      avatarUrl: u.avatarUrl ?? null,
    };
  }));
  res.json(result);
});

/* GET /api/admin/members/:id/attendance — full attendance list for one member */
router.get("/members/:id/attendance", async (req, res) => {
  const records = await db.query.attendanceTable.findMany({
    where: eq(attendanceTable.userId, Number(req.params.id)),
    with: { event: true },
  });
  res.json(records.map(r => ({
    id: r.id,
    userId: r.userId,
    eventId: r.eventId,
    earnedMedal: r.earnedMedal,
    attendedAt: r.attendedAt.toISOString(),
    event: {
      id: r.event.id,
      title: r.event.title,
      date: r.event.date.toISOString(),
      location: r.event.location,
    },
  })));
});

/* POST /api/admin/attendance — mark a member as attended an event */
router.post("/attendance", async (req, res) => {
  const { userId, eventId, earnedMedal } = req.body;
  const existing = await db.query.attendanceTable.findFirst({
    where: and(eq(attendanceTable.userId, Number(userId)), eq(attendanceTable.eventId, Number(eventId))),
  });
  if (existing) {
    res.status(409).json({ error: "Attendance already recorded" });
    return;
  }
  const [record] = await db.insert(attendanceTable)
    .values({ userId: Number(userId), eventId: Number(eventId), earnedMedal: !!earnedMedal })
    .returning();

  // bump attendeeCount
  const event = await db.query.eventsTable.findFirst({ where: eq(eventsTable.id, Number(eventId)) });
  if (event) {
    await db.update(eventsTable).set({ attendeeCount: event.attendeeCount + 1 }).where(eq(eventsTable.id, Number(eventId)));
  }

  res.status(201).json({
    id: record.id,
    userId: record.userId,
    eventId: record.eventId,
    earnedMedal: record.earnedMedal,
    attendedAt: record.attendedAt.toISOString(),
  });
});

/* DELETE /api/admin/attendance/:id — remove attendance record */
router.delete("/attendance/:id", async (req, res) => {
  const record = await db.query.attendanceTable.findFirst({ where: eq(attendanceTable.id, Number(req.params.id)) });
  if (!record) { res.status(404).json({ error: "Not found" }); return; }

  await db.delete(attendanceTable).where(eq(attendanceTable.id, Number(req.params.id)));

  const event = await db.query.eventsTable.findFirst({ where: eq(eventsTable.id, record.eventId) });
  if (event && event.attendeeCount > 0) {
    await db.update(eventsTable).set({ attendeeCount: event.attendeeCount - 1 }).where(eq(eventsTable.id, record.eventId));
  }

  res.json({ ok: true });
});

export default router;
