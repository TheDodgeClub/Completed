import { Router, type IRouter } from "express";
import { db, eventsTable, postsTable, merchTable, usersTable, attendanceTable, awardsTable, videosTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.use(requireAdmin);

/* ========== EVENTS ========== */

function toAdminEvent(e: typeof eventsTable.$inferSelect) {
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
  };
}

/* GET /api/admin/events — list all events (incl past, incl unpublished) */
router.get("/events", async (_req, res) => {
  const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.date));
  res.json(events.map(toAdminEvent));
});

/* POST /api/admin/events — create */
router.post("/events", async (req, res) => {
  const { title, description, date, location, ticketUrl, imageUrl } = req.body;
  const [event] = await db.insert(eventsTable)
    .values({ title, description, date: new Date(date), location, ticketUrl: ticketUrl || null, imageUrl: imageUrl || null })
    .returning();
  res.status(201).json(toAdminEvent(event));
});

/* PUT /api/admin/events/:id — update */
router.put("/events/:id", async (req, res) => {
  const { title, description, date, location, ticketUrl, imageUrl } = req.body;
  const [event] = await db.update(eventsTable)
    .set({ title, description, date: date ? new Date(date) : undefined, location, ticketUrl: ticketUrl || null, imageUrl: imageUrl || null })
    .where(eq(eventsTable.id, Number(req.params.id)))
    .returning();
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toAdminEvent(event));
});

/* POST /api/admin/events/:id/publish — toggle published state */
router.post("/events/:id/publish", async (req, res) => {
  const { publish } = req.body;
  const [event] = await db.update(eventsTable)
    .set({ isPublished: !!publish })
    .where(eq(eventsTable.id, Number(req.params.id)))
    .returning();
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toAdminEvent(event));
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
    const awards = await db.select().from(awardsTable).where(eq(awardsTable.userId, u.id));
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin,
      memberSince: u.createdAt.toISOString(),
      eventsAttended: records.length,
      medalsEarned: records.filter(r => r.earnedMedal).length + awards.filter(a => a.type === "medal").length,
      ringsEarned: awards.filter(a => a.type === "ring").length,
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

/* ========== AWARDS ========== */

/* GET /api/admin/members/:id/awards — list all direct awards for a member */
router.get("/members/:id/awards", async (req, res) => {
  const awards = await db.select().from(awardsTable)
    .where(eq(awardsTable.userId, Number(req.params.id)))
    .orderBy(desc(awardsTable.awardedAt));
  res.json(awards.map(a => ({
    id: a.id,
    userId: a.userId,
    type: a.type,
    note: a.note ?? null,
    awardedAt: a.awardedAt.toISOString(),
  })));
});

/* POST /api/admin/awards — award a medal or ring to a member */
router.post("/awards", async (req, res) => {
  const { userId, type, note } = req.body;
  if (!userId || !["medal", "ring"].includes(type)) {
    res.status(400).json({ error: "userId and type ('medal'|'ring') required" });
    return;
  }
  const [award] = await db.insert(awardsTable)
    .values({ userId: Number(userId), type, note: note || null })
    .returning();
  res.status(201).json({
    id: award.id,
    userId: award.userId,
    type: award.type,
    note: award.note ?? null,
    awardedAt: award.awardedAt.toISOString(),
  });
});

/* DELETE /api/admin/awards/:id — revoke an award */
router.delete("/awards/:id", async (req, res) => {
  const award = await db.query.awardsTable.findFirst({ where: eq(awardsTable.id, Number(req.params.id)) });
  if (!award) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(awardsTable).where(eq(awardsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* ========== VIDEOS ========== */

function toAdminVideo(v: typeof videosTable.$inferSelect) {
  return {
    id: v.id,
    title: v.title,
    description: v.description ?? null,
    url: v.url,
    thumbnailUrl: v.thumbnailUrl ?? null,
    isPublished: v.isPublished,
    publishedAt: v.publishedAt?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
  };
}

/* GET /api/admin/videos — list all videos */
router.get("/videos", async (_req, res) => {
  const videos = await db.select().from(videosTable).orderBy(desc(videosTable.createdAt));
  res.json(videos.map(toAdminVideo));
});

/* POST /api/admin/videos — create */
router.post("/videos", async (req, res) => {
  const { title, description, url, thumbnailUrl, isPublished } = req.body;
  const published = !!isPublished;
  const [video] = await db.insert(videosTable)
    .values({
      title,
      description: description || null,
      url,
      thumbnailUrl: thumbnailUrl || null,
      isPublished: published,
      publishedAt: published ? new Date() : null,
    })
    .returning();
  res.status(201).json(toAdminVideo(video));
});

/* PUT /api/admin/videos/:id — update */
router.put("/videos/:id", async (req, res) => {
  const { title, description, url, thumbnailUrl } = req.body;
  const [video] = await db.update(videosTable)
    .set({ title, description: description || null, url, thumbnailUrl: thumbnailUrl || null })
    .where(eq(videosTable.id, Number(req.params.id)))
    .returning();
  if (!video) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toAdminVideo(video));
});

/* POST /api/admin/videos/:id/publish — toggle published state */
router.post("/videos/:id/publish", async (req, res) => {
  const { publish } = req.body;
  const published = !!publish;
  const [video] = await db.update(videosTable)
    .set({ isPublished: published, publishedAt: published ? new Date() : null })
    .where(eq(videosTable.id, Number(req.params.id)))
    .returning();
  if (!video) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toAdminVideo(video));
});

/* DELETE /api/admin/videos/:id */
router.delete("/videos/:id", async (req, res) => {
  await db.delete(videosTable).where(eq(videosTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

export default router;
