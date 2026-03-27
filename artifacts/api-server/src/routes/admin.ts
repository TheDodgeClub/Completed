import { Router, type IRouter } from "express";
import { db, eventsTable, postsTable, merchTable, usersTable, attendanceTable, awardsTable, videosTable, eventRegistrationsTable, userSessionsTable, ticketsTable, announcementsTable, ticketTypesTable, discountCodesTable } from "@workspace/db";
import { eq, desc, and, avg, count, sum, gte, sql, lte, or, isNull } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.use(requireAdmin);

/* ========== EVENTS ========== */

type TicketTypeSummary = { count: number; minPrice: number | null; maxPrice: number | null };

function toAdminEvent(e: typeof eventsTable.$inferSelect, ttSummary?: TicketTypeSummary) {
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
    ticketPrice: e.ticketPrice ? Number(e.ticketPrice) : null,
    ticketCapacity: e.ticketCapacity ?? null,
    stripeProductId: e.stripeProductId ?? null,
    stripePriceId: e.stripePriceId ?? null,
    checkoutFields: (e.checkoutFields as any[]) ?? [],
    waiverText: e.waiverText ?? null,
    eliteEarlyAccess: e.eliteEarlyAccess,
    eliteDiscountPercent: e.eliteDiscountPercent ?? null,
    xpReward: e.xpReward ?? 50,
    ticketTypeCount: ttSummary?.count ?? 0,
    ticketTypeMinPrice: ttSummary?.minPrice ?? null,
    ticketTypeMaxPrice: ttSummary?.maxPrice ?? null,
  };
}

/* GET /api/admin/events — list all events (incl past, incl unpublished) */
router.get("/events", async (_req, res) => {
  const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.date));
  const allTypes = await db.select().from(ticketTypesTable);

  const ttMap = new Map<number, TicketTypeSummary>();
  for (const t of allTypes) {
    const existing = ttMap.get(t.eventId);
    const price = t.price;
    if (!existing) {
      ttMap.set(t.eventId, { count: 1, minPrice: price, maxPrice: price });
    } else {
      existing.count++;
      if (existing.minPrice === null || price < existing.minPrice) existing.minPrice = price;
      if (existing.maxPrice === null || price > existing.maxPrice) existing.maxPrice = price;
    }
  }

  res.json(events.map(e => toAdminEvent(e, ttMap.get(e.id))));
});

/* POST /api/admin/events — create */
router.post("/events", async (req, res) => {
  const { title, description, date, location, ticketUrl, imageUrl, xpReward } = req.body;
  const [event] = await db.insert(eventsTable)
    .values({ title, description, date: new Date(date), location, ticketUrl: ticketUrl || null, imageUrl: imageUrl || null, xpReward: xpReward != null ? Number(xpReward) : 50 })
    .returning();
  res.status(201).json(toAdminEvent(event));
});

/* PUT /api/admin/events/:id — update */
router.put("/events/:id", async (req, res) => {
  const { title, description, date, location, ticketUrl, imageUrl, eliteEarlyAccess, eliteDiscountPercent, xpReward } = req.body;
  const [event] = await db.update(eventsTable)
    .set({
      title, description,
      date: date ? new Date(date) : undefined,
      location,
      ticketUrl: ticketUrl || null,
      imageUrl: imageUrl || null,
      eliteEarlyAccess: eliteEarlyAccess !== undefined ? !!eliteEarlyAccess : undefined,
      eliteDiscountPercent: eliteDiscountPercent != null ? Number(eliteDiscountPercent) : null,
      xpReward: xpReward != null ? Number(xpReward) : undefined,
    })
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

/* POST /api/admin/events/:id/duplicate — clone an event as an unpublished draft */
router.post("/events/:id/duplicate", async (req, res) => {
  const sourceId = Number(req.params.id);
  const [source] = await db.select().from(eventsTable).where(eq(eventsTable.id, sourceId)).limit(1);
  if (!source) { res.status(404).json({ error: "Not found" }); return; }

  // 1. Duplicate the event itself
  const [copy] = await db.insert(eventsTable).values({
    title: `Copy of ${source.title}`,
    description: source.description,
    date: source.date,
    location: source.location,
    ticketUrl: source.ticketUrl,
    imageUrl: source.imageUrl,
    checkoutFields: source.checkoutFields,
    waiverText: source.waiverText,
    xpReward: source.xpReward,
    eliteEarlyAccess: source.eliteEarlyAccess,
    eliteDiscountPercent: source.eliteDiscountPercent,
    isPublished: false,
  }).returning();

  // 2. Duplicate ticket types (reset sold count + Stripe IDs — checkout uses price_data override anyway)
  const sourceTypes = await db.select().from(ticketTypesTable).where(eq(ticketTypesTable.eventId, sourceId));
  if (sourceTypes.length > 0) {
    await db.insert(ticketTypesTable).values(
      sourceTypes.map(t => ({
        eventId: copy.id,
        name: t.name,
        description: t.description,
        price: t.price,
        quantity: t.quantity,
        quantitySold: 0,
        saleStartsAt: t.saleStartsAt,
        saleEndsAt: t.saleEndsAt,
        isActive: t.isActive,
        sortOrder: t.sortOrder,
        stripeProductId: null,
        stripePriceId: null,
      }))
    );
  }

  // 3. Duplicate discount codes (reset uses count, append suffix to keep code unique)
  const sourceCodes = await db.select().from(discountCodesTable).where(eq(discountCodesTable.eventId, sourceId));
  if (sourceCodes.length > 0) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    await db.insert(discountCodesTable).values(
      sourceCodes.map(c => ({
        eventId: copy.id,
        code: `${c.code}-${suffix}`,
        discountType: c.discountType,
        discountAmount: c.discountAmount,
        maxUses: c.maxUses,
        usesCount: 0,
        expiresAt: c.expiresAt,
        isActive: c.isActive,
      }))
    );
  }

  res.status(201).json(toAdminEvent(copy));
});

/* DELETE /api/admin/events/:id */
router.delete("/events/:id", async (req, res) => {
  await db.delete(attendanceTable).where(eq(attendanceTable.eventId, Number(req.params.id)));
  await db.delete(eventsTable).where(eq(eventsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* POST /api/admin/events/:id/tickets — set ticket price (creates/updates Stripe product+price) */
router.post("/events/:id/tickets", async (req, res) => {
  const eventId = Number(req.params.id);
  const { price, capacity } = req.body as { price?: number; capacity?: number };

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) { res.status(404).json({ error: "Not found" }); return; }

  // price = 0 means free (no Stripe needed)
  if (!price || price <= 0) {
    const [updated] = await db.update(eventsTable)
      .set({ ticketPrice: "0", ticketCapacity: capacity ?? null, stripeProductId: null, stripePriceId: null })
      .where(eq(eventsTable.id, eventId))
      .returning();
    res.json(toAdminEvent(updated));
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const priceInCents = Math.round(price * 100);

    let productId = event.stripeProductId;
    if (!productId) {
      const product = await stripe.products.create({
        name: `Ticket — ${event.title}`,
        description: event.description,
        metadata: { eventId: String(eventId) },
      });
      productId = product.id;
    } else {
      await stripe.products.update(productId, {
        name: `Ticket — ${event.title}`,
        metadata: { eventId: String(eventId) },
      });
    }

    // Archive old price if it exists
    if (event.stripePriceId) {
      await stripe.prices.update(event.stripePriceId, { active: false }).catch(() => {});
    }

    const stripePrice = await stripe.prices.create({
      product: productId,
      unit_amount: priceInCents,
      currency: "gbp",
      metadata: { eventId: String(eventId) },
    });

    const [updated] = await db.update(eventsTable)
      .set({
        ticketPrice: String(price),
        ticketCapacity: capacity ?? null,
        stripeProductId: productId,
        stripePriceId: stripePrice.id,
      })
      .where(eq(eventsTable.id, eventId))
      .returning();

    res.json(toAdminEvent(updated));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Stripe error" });
  }
});

/* PUT /api/admin/events/:id/checkout — update checkout form fields and waiver */
router.put("/events/:id/checkout", async (req, res) => {
  const eventId = Number(req.params.id);
  const { checkoutFields, waiverText } = req.body as {
    checkoutFields?: any[];
    waiverText?: string;
  };

  const [event] = await db.update(eventsTable)
    .set({
      checkoutFields: checkoutFields ?? [],
      waiverText: waiverText ?? null,
    })
    .where(eq(eventsTable.id, eventId))
    .returning();

  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toAdminEvent(event));
});

/* GET /api/admin/events/:id/tickets — ticket sales for an event */
router.get("/events/:id/tickets", async (req, res) => {
  const eventId = Number(req.params.id);
  const tickets = await db
    .select({
      id: ticketsTable.id,
      userId: ticketsTable.userId,
      status: ticketsTable.status,
      ticketCode: ticketsTable.ticketCode,
      checkedIn: ticketsTable.checkedIn,
      checkedInAt: ticketsTable.checkedInAt,
      amountPaid: ticketsTable.amountPaid,
      createdAt: ticketsTable.createdAt,
      userName: usersTable.name,
      userEmail: usersTable.email,
    })
    .from(ticketsTable)
    .innerJoin(usersTable, eq(ticketsTable.userId, usersTable.id))
    .where(and(eq(ticketsTable.eventId, eventId), eq(ticketsTable.status, "paid")))
    .orderBy(desc(ticketsTable.createdAt));
  res.json(tickets);
});

/* ========== TICKET MANAGEMENT ========== */

/* GET /api/admin/tickets — all paid tickets with member + event info */
router.get("/tickets", async (req, res) => {
  const rows = await db
    .select({
      id: ticketsTable.id,
      ticketCode: ticketsTable.ticketCode,
      status: ticketsTable.status,
      amountPaid: ticketsTable.amountPaid,
      checkedIn: ticketsTable.checkedIn,
      checkedInAt: ticketsTable.checkedInAt,
      giftRecipientEmail: ticketsTable.giftRecipientEmail,
      createdAt: ticketsTable.createdAt,
      userId: ticketsTable.userId,
      userName: usersTable.name,
      userEmail: usersTable.email,
      eventId: eventsTable.id,
      eventTitle: eventsTable.title,
      eventDate: eventsTable.date,
      eventLocation: eventsTable.location,
    })
    .from(ticketsTable)
    .innerJoin(usersTable, eq(ticketsTable.userId, usersTable.id))
    .innerJoin(eventsTable, eq(ticketsTable.eventId, eventsTable.id))
    .where(eq(ticketsTable.status, "paid"))
    .orderBy(desc(ticketsTable.createdAt));
  res.json(rows);
});

/* DELETE /api/admin/tickets/:id — cancel a ticket */
router.delete("/tickets/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [ticket] = await db
    .update(ticketsTable)
    .set({ status: "cancelled" })
    .where(eq(ticketsTable.id, id))
    .returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  res.json({ ok: true, ticket });
});

/* PUT /api/admin/tickets/:id/reallocate — reassign ticket to another user */
router.put("/tickets/:id/reallocate", async (req, res) => {
  const id = Number(req.params.id);
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  const newOwner = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email.toLowerCase()) });
  if (!newOwner) { res.status(404).json({ error: "No member found with that email address" }); return; }
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  // Check new owner doesn't already have a ticket for this event
  const [existing] = await db.select().from(ticketsTable)
    .where(and(eq(ticketsTable.userId, newOwner.id), eq(ticketsTable.eventId, ticket.eventId), eq(ticketsTable.status, "paid")))
    .limit(1);
  if (existing && existing.id !== id) {
    res.status(409).json({ error: "That member already has a ticket for this event" }); return;
  }
  const [updated] = await db
    .update(ticketsTable)
    .set({ userId: newOwner.id, giftRecipientEmail: null })
    .where(eq(ticketsTable.id, id))
    .returning();
  res.json({ ok: true, ticket: updated, newOwner: { id: newOwner.id, name: newOwner.name, email: newOwner.email } });
});

/* POST /api/admin/tickets/:id/resend — resend ticket confirmation email */
router.post("/tickets/:id/resend", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .select({
      ticketCode: ticketsTable.ticketCode,
      giftRecipientEmail: ticketsTable.giftRecipientEmail,
      userName: usersTable.name,
      userEmail: usersTable.email,
      eventTitle: eventsTable.title,
      eventDate: eventsTable.date,
      eventLocation: eventsTable.location,
    })
    .from(ticketsTable)
    .innerJoin(usersTable, eq(ticketsTable.userId, usersTable.id))
    .innerJoin(eventsTable, eq(ticketsTable.eventId, eventsTable.id))
    .where(eq(ticketsTable.id, id))
    .limit(1);
  if (!row) { res.status(404).json({ error: "Ticket not found" }); return; }
  const { sendTicketConfirmationEmail } = await import("../services/email");
  const toEmail = row.giftRecipientEmail ?? row.userEmail;
  const toName = row.giftRecipientEmail ? row.giftRecipientEmail : (row.userName ?? row.userEmail);
  await sendTicketConfirmationEmail({
    toEmail,
    toName,
    eventName: row.eventTitle,
    eventDate: row.eventDate,
    eventLocation: row.eventLocation,
    ticketCodes: [row.ticketCode],
  });
  res.json({ ok: true, sentTo: toEmail });
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
    isEliteOnly: p.isEliteOnly,
  })));
});

/* POST /api/admin/posts — create */
router.post("/posts", async (req, res) => {
  const { title, content, imageUrl, isMembersOnly, isEliteOnly } = req.body;
  const [post] = await db.insert(postsTable)
    .values({ title, content, imageUrl: imageUrl || null, isMembersOnly: !!isMembersOnly, isEliteOnly: !!isEliteOnly, authorId: req.session!.userId })
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
    isEliteOnly: post.isEliteOnly,
  });
});

/* PUT /api/admin/posts/:id — update */
router.put("/posts/:id", async (req, res) => {
  const { title, content, imageUrl, isMembersOnly, isEliteOnly } = req.body;
  const [post] = await db.update(postsTable)
    .set({ title, content, imageUrl: imageUrl || null, isMembersOnly: !!isMembersOnly, isEliteOnly: !!isEliteOnly })
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
    isEliteOnly: post.isEliteOnly,
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

const LEVEL_THRESHOLDS = [0, 300, 800, 1600, 2500, 5000, 10000, 20000, 40000, 80000];
const ATTENDANCE_MILESTONES = [
  { events: 5,  bonus: 100  },
  { events: 10, bonus: 250  },
  { events: 25, bonus: 500  },
  { events: 50, bonus: 1000 },
];
function computeAttendanceXP(attendedEventIds: Set<number>, pastEvents: { id: number; xpReward: number }[]) {
  let streak = 0, bestStreak = 0, eventXP = 0, attendedCount = 0;
  for (const ev of pastEvents) {
    if (attendedEventIds.has(ev.id)) {
      streak++; attendedCount++;
      eventXP += (ev.xpReward ?? 50) + (streak >= 8 ? 50 : streak >= 4 ? 25 : streak >= 2 ? 10 : 0);
      for (const m of ATTENDANCE_MILESTONES) { if (attendedCount === m.events) { eventXP += m.bonus; break; } }
      if (streak > bestStreak) bestStreak = streak;
    } else { streak = 0; }
  }
  return { eventXP, currentStreak: streak, bestStreak, eventsAttended: attendedCount };
}
function computeXP(eventXP: number, medals: number, rings: number, bonus: number = 0, gameXp: number = 0, isElite: boolean = false) { return eventXP + medals * 300 + rings * 1000 + bonus + gameXp + (isElite ? 500 : 0); }
function computeLevel(xp: number) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1; else break;
  }
  return level;
}

/* GET /api/admin/members — list all users */
router.get("/members", async (_req, res) => {
  const [users, allAttendance, allAwards, pastEvents] = await Promise.all([
    db.select().from(usersTable).orderBy(usersTable.name),
    db.select().from(attendanceTable),
    db.select().from(awardsTable),
    db.select({ id: eventsTable.id, xpReward: eventsTable.xpReward }).from(eventsTable).where(lte(eventsTable.date, new Date())).orderBy(eventsTable.date),
  ]);

  const attendanceEventsByUser = new Map<number, Set<number>>();
  const attendanceMedalsByUser = new Map<number, number>();
  for (const r of allAttendance) {
    if (!attendanceEventsByUser.has(r.userId)) attendanceEventsByUser.set(r.userId, new Set());
    attendanceEventsByUser.get(r.userId)!.add(r.eventId);
    if (r.earnedMedal) attendanceMedalsByUser.set(r.userId, (attendanceMedalsByUser.get(r.userId) ?? 0) + 1);
  }
  const awardsByUser = new Map<number, typeof allAwards>();
  for (const a of allAwards) {
    if (!awardsByUser.has(a.userId)) awardsByUser.set(a.userId, []);
    awardsByUser.get(a.userId)!.push(a);
  }

  const userNameMap = new Map<number, string>();
  for (const u of users) userNameMap.set(u.id, u.name);
  const referralCountMap = new Map<number, number>();
  for (const u of users) {
    if (u.referredBy) referralCountMap.set(u.referredBy, (referralCountMap.get(u.referredBy) ?? 0) + 1);
  }

  const result = users.map((u) => {
    const awards = awardsByUser.get(u.id) ?? [];
    const { eventXP, eventsAttended, currentStreak, bestStreak } = computeAttendanceXP(attendanceEventsByUser.get(u.id) ?? new Set(), pastEvents);
    const medalsEarned = (attendanceMedalsByUser.get(u.id) ?? 0) + awards.filter(a => a.type === "medal").length;
    const ringsEarned = awards.filter(a => a.type === "ring").length;
    const xp = computeXP(eventXP, medalsEarned, ringsEarned, u.bonusXp ?? 0, u.gameXp ?? 0, u.isElite ?? false);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin,
      memberSince: (u.memberSince ?? u.createdAt).toISOString(),
      eventsAttended,
      medalsEarned,
      ringsEarned,
      xp,
      level: computeLevel(xp),
      currentStreak,
      bestStreak,
      avatarUrl: u.avatarUrl ?? null,
      username: u.username ?? null,
      preferredRole: u.preferredRole ?? null,
      bio: u.bio ?? null,
      isElite: u.isElite,
      eliteSince: u.eliteSince?.toISOString() ?? null,
      stripeSubscriptionId: u.stripeSubscriptionId ?? null,
      accountType: u.accountType ?? "player",
      referralCode: u.referralCode ?? null,
      referredByName: u.referredBy ? (userNameMap.get(u.referredBy) ?? null) : null,
      referralCount: referralCountMap.get(u.id) ?? 0,
    };
  });
  res.json(result);
});

/* PUT /api/admin/members/:id — edit member profile */
router.put("/members/:id", async (req, res) => {
  const { name, username, bio, memberSince } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (username !== undefined) updates.username = username || null;
  if (bio !== undefined) updates.bio = bio || null;
  if (memberSince !== undefined) updates.memberSince = memberSince ? new Date(memberSince) : null;

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, Number(req.params.id))).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const [records, awards, pastEvents] = await Promise.all([
    db.select().from(attendanceTable).where(eq(attendanceTable.userId, user.id)),
    db.select().from(awardsTable).where(eq(awardsTable.userId, user.id)),
    db.select({ id: eventsTable.id, xpReward: eventsTable.xpReward }).from(eventsTable).where(lte(eventsTable.date, new Date())).orderBy(eventsTable.date),
  ]);
  const attendedIds = new Set(records.map(r => r.eventId));
  const { eventXP, eventsAttended, currentStreak, bestStreak } = computeAttendanceXP(attendedIds, pastEvents);
  const medalsEarned = records.filter(r => r.earnedMedal).length + awards.filter(a => a.type === "medal").length;
  const ringsEarned = awards.filter(a => a.type === "ring").length;
  const xp = computeXP(eventXP, medalsEarned, ringsEarned, user.bonusXp ?? 0, user.gameXp ?? 0, user.isElite ?? false);
  res.json({
    id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin,
    memberSince: (user.memberSince ?? user.createdAt).toISOString(), eventsAttended, medalsEarned, ringsEarned, xp,
    level: computeLevel(xp), currentStreak, bestStreak, avatarUrl: user.avatarUrl ?? null,
    username: user.username ?? null, preferredRole: user.preferredRole ?? null, bio: user.bio ?? null,
  });
});

/* DELETE /api/admin/members/:id */
router.delete("/members/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(attendanceTable).where(eq(attendanceTable.userId, id));
  await db.delete(awardsTable).where(eq(awardsTable.userId, id));
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ ok: true });
});

/* POST /api/admin/members/:id/register — register a member for an upcoming event */
router.post("/members/:id/register", async (req, res) => {
  const { eventId } = req.body;
  if (!eventId) { res.status(400).json({ error: "eventId required" }); return; }
  try {
    const [reg] = await db.insert(eventRegistrationsTable)
      .values({ userId: Number(req.params.id), eventId: Number(eventId) })
      .returning();
    res.status(201).json({ id: reg.id, userId: reg.userId, eventId: reg.eventId, registeredAt: reg.registeredAt.toISOString() });
  } catch {
    res.status(409).json({ error: "Already registered" });
  }
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

/* ========== PUSH NOTIFICATIONS ========== */

/* POST /api/admin/notify — send push notification to all subscribed members */
router.post("/notify", async (req, res) => {
  const { title, body: notifBody, data } = req.body;
  if (!title || !notifBody) {
    res.status(400).json({ error: "title and body are required" });
    return;
  }

  const subscribers = await db.query.usersTable.findMany({
    where: (u, { and, eq, isNotNull }) =>
      and(eq(u.notificationsEnabled, true), isNotNull(u.pushToken)) as ReturnType<typeof and>,
  });

  const tokens = subscribers
    .map(u => u.pushToken)
    .filter((t): t is string => !!t && t.startsWith("ExponentPushToken["));

  if (tokens.length === 0) {
    res.json({ sent: 0, message: "No subscribers with valid push tokens" });
    return;
  }

  const messages = tokens.map(to => ({
    to,
    title,
    body: notifBody,
    data: data ?? {},
    sound: "default" as const,
    priority: "high" as const,
  }));

  const batchSize = 100;
  let sent = 0;
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(batch),
    }).catch(() => null);
    sent += batch.length;
  }

  await db.insert(announcementsTable).values({
    title,
    body: notifBody,
    sentCount: sent,
    sentBy: "admin",
  }).catch(() => null);

  res.json({ sent });
});

/* GET /api/admin/announcements — list sent announcements (admin only) */
router.get("/announcements", async (_req, res) => {
  const announcements = await db
    .select()
    .from(announcementsTable)
    .orderBy(desc(announcementsTable.createdAt))
    .limit(20);
  res.json(announcements);
});

/* POST /api/admin/notify-event-reminders — send 48h reminders for events happening in the next 24–52h */
router.post("/notify-event-reminders", async (_req, res) => {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 52 * 60 * 60 * 1000);

  const upcomingEvents = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.isPublished, true), gte(eventsTable.date, windowStart), lte(eventsTable.date, windowEnd)));

  if (upcomingEvents.length === 0) {
    res.json({ sent: 0, events: 0, message: "No events in the 48h window" });
    return;
  }

  let totalSent = 0;
  for (const event of upcomingEvents) {
    const ticketHolders = await db
      .select({ userId: ticketsTable.userId })
      .from(ticketsTable)
      .where(and(eq(ticketsTable.eventId, event.id), sql`${ticketsTable.status} IN ('paid', 'free')`));

    if (ticketHolders.length === 0) continue;

    const holderIds = ticketHolders.map(t => t.userId);
    const users = await db.query.usersTable.findMany({
      where: (u, { and: a, eq: e, isNotNull, inArray: inA }) =>
        a(e(u.notificationsEnabled, true), isNotNull(u.pushToken)) as ReturnType<typeof a>,
    });

    const tokens = users
      .filter(u => holderIds.includes(u.id))
      .map(u => u.pushToken)
      .filter((t): t is string => !!t && t.startsWith("ExponentPushToken["));

    if (tokens.length === 0) continue;

    const eventDate = new Date(event.date);
    const hoursUntil = Math.round((eventDate.getTime() - now.getTime()) / 3600000);
    const messages = tokens.map(to => ({
      to,
      title: `⏰ ${event.title} is tomorrow!`,
      body: `Your spot is confirmed — see you in ${hoursUntil} hours at ${event.location}.`,
      data: { eventId: String(event.id) },
      sound: "default" as const,
      priority: "high" as const,
    }));

    for (let i = 0; i < messages.length; i += 100) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(messages.slice(i, i + 100)),
      }).catch(() => null);
      totalSent += messages.slice(i, i + 100).length;
    }
  }

  res.json({ sent: totalSent, events: upcomingEvents.length });
});

/* ========== LIVE USERS ========== */

/* GET /api/admin/live-users — users active in the last 5 minutes */
router.get("/live-users", async (_req, res) => {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      avatarUrl: usersTable.avatarUrl,
      lastSeenAt: usersTable.lastSeenAt,
    })
    .from(usersTable)
    .where(gte(usersTable.lastSeenAt, cutoff))
    .orderBy(desc(usersTable.lastSeenAt));
  res.json({ count: rows.length, users: rows });
});

/* ========== SESSION ANALYTICS ========== */

/* GET /api/admin/sessions/stats — engagement analytics */
router.get("/sessions/stats", async (_req, res) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [allStats] = await db
    .select({
      totalSessions: count(),
      avgDuration: avg(userSessionsTable.duration),
      totalSeconds: sum(userSessionsTable.duration),
    })
    .from(userSessionsTable);

  const [todayStats] = await db
    .select({
      sessions: count(),
      avgDuration: avg(userSessionsTable.duration),
    })
    .from(userSessionsTable)
    .where(gte(userSessionsTable.startedAt, todayStart));

  const [weekStats] = await db
    .select({
      sessions: count(),
      avgDuration: avg(userSessionsTable.duration),
    })
    .from(userSessionsTable)
    .where(gte(userSessionsTable.startedAt, weekStart));

  const topUsers = await db
    .select({
      userId: userSessionsTable.userId,
      name: usersTable.name,
      avatarUrl: usersTable.avatarUrl,
      sessions: count(),
      avgDuration: avg(userSessionsTable.duration),
      totalSeconds: sum(userSessionsTable.duration),
    })
    .from(userSessionsTable)
    .innerJoin(usersTable, eq(userSessionsTable.userId, usersTable.id))
    .groupBy(userSessionsTable.userId, usersTable.name, usersTable.avatarUrl)
    .orderBy(desc(sum(userSessionsTable.duration)))
    .limit(8);

  const dailyBreakdown = await db
    .select({
      day: sql<string>`DATE(${userSessionsTable.startedAt})`,
      sessions: count(),
      avgDuration: avg(userSessionsTable.duration),
    })
    .from(userSessionsTable)
    .where(gte(userSessionsTable.startedAt, weekStart))
    .groupBy(sql`DATE(${userSessionsTable.startedAt})`)
    .orderBy(sql`DATE(${userSessionsTable.startedAt})`);

  res.json({
    totalSessions: Number(allStats?.totalSessions ?? 0),
    avgDuration: Math.round(Number(allStats?.avgDuration ?? 0)),
    totalSeconds: Number(allStats?.totalSeconds ?? 0),
    todaySessions: Number(todayStats?.sessions ?? 0),
    todayAvgDuration: Math.round(Number(todayStats?.avgDuration ?? 0)),
    weekSessions: Number(weekStats?.sessions ?? 0),
    weekAvgDuration: Math.round(Number(weekStats?.avgDuration ?? 0)),
    topUsers: topUsers.map(u => ({
      userId: u.userId,
      name: u.name,
      avatarUrl: u.avatarUrl,
      sessions: Number(u.sessions),
      avgDuration: Math.round(Number(u.avgDuration ?? 0)),
      totalSeconds: Number(u.totalSeconds ?? 0),
    })),
    dailyBreakdown: dailyBreakdown.map(d => ({
      day: d.day,
      sessions: Number(d.sessions),
      avgDuration: Math.round(Number(d.avgDuration ?? 0)),
    })),
  });
});

/* ========== ELITE MANAGEMENT ========== */

/* POST /api/admin/elite/grant — manually grant Elite to any user */
router.post("/elite/grant", async (req: any, res) => {
  const { userId } = req.body as { userId?: number };
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await db.update(usersTable)
    .set({
      isElite: true,
      eliteSince: user.eliteSince ?? new Date(),
    })
    .where(eq(usersTable.id, userId));

  res.json({ ok: true });
});

/* POST /api/admin/elite/revoke — manually revoke Elite from a user */
router.post("/elite/revoke", async (req: any, res) => {
  const { userId } = req.body as { userId?: number };
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await db.update(usersTable)
    .set({ isElite: false, stripeSubscriptionId: null })
    .where(eq(usersTable.id, userId));

  res.json({ ok: true });
});

/* ========== TICKET TYPES ========== */

function toTicketType(t: typeof ticketTypesTable.$inferSelect) {
  return {
    id: t.id,
    eventId: t.eventId,
    name: t.name,
    description: t.description ?? null,
    price: t.price,
    quantity: t.quantity ?? null,
    quantitySold: t.quantitySold,
    maxPerOrder: t.maxPerOrder ?? null,
    saleStartsAt: t.saleStartsAt?.toISOString() ?? null,
    saleEndsAt: t.saleEndsAt?.toISOString() ?? null,
    isActive: t.isActive,
    sortOrder: t.sortOrder,
    stripeProductId: t.stripeProductId ?? null,
    stripePriceId: t.stripePriceId ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/events/:id/ticket-types", async (req, res) => {
  const eventId = Number(req.params.id);
  const types = await db.select().from(ticketTypesTable)
    .where(eq(ticketTypesTable.eventId, eventId))
    .orderBy(ticketTypesTable.sortOrder, ticketTypesTable.createdAt);
  res.json(types.map(toTicketType));
});

router.post("/events/:id/ticket-types", async (req, res) => {
  const eventId = Number(req.params.id);
  const { name, description, price, quantity, maxPerOrder, saleStartsAt, saleEndsAt, isActive } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }

  const priceInPence = Math.round((Number(price) || 0) * 100);
  let stripeProductId: string | null = null;
  let stripePriceId: string | null = null;

  if (priceInPence > 0) {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (event) {
      try {
        const stripe = await getUncachableStripeClient();
        const product = await stripe.products.create({
          name: `${event.title} — ${name}`,
          metadata: { eventId: String(eventId) },
        });
        const sp = await stripe.prices.create({ product: product.id, unit_amount: priceInPence, currency: "gbp" });
        stripeProductId = product.id;
        stripePriceId = sp.id;
      } catch (err) { console.error("Stripe error creating ticket type:", err); }
    }
  }

  const existing = await db.select().from(ticketTypesTable).where(eq(ticketTypesTable.eventId, eventId));
  const [type] = await db.insert(ticketTypesTable).values({
    eventId,
    name,
    description: description || null,
    price: priceInPence,
    quantity: quantity ? Number(quantity) : null,
    maxPerOrder: maxPerOrder ? Number(maxPerOrder) : null,
    saleStartsAt: saleStartsAt ? new Date(saleStartsAt) : null,
    saleEndsAt: saleEndsAt ? new Date(saleEndsAt) : null,
    isActive: isActive !== false,
    sortOrder: existing.length,
    stripeProductId,
    stripePriceId,
  }).returning();
  res.status(201).json(toTicketType(type));
});

router.put("/ticket-types/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, price, quantity, maxPerOrder, saleStartsAt, saleEndsAt, isActive, sortOrder } = req.body;
  const [existing] = await db.select().from(ticketTypesTable).where(eq(ticketTypesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const priceInPence = price !== undefined ? Math.round(Number(price) * 100) : existing.price;
  let stripePriceId = existing.stripePriceId;
  let stripeProductId = existing.stripeProductId;

  if (price !== undefined && priceInPence !== existing.price) {
    if (priceInPence > 0) {
      try {
        const stripe = await getUncachableStripeClient();
        const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, existing.eventId)).limit(1);
        if (!stripeProductId) {
          const prod = await stripe.products.create({ name: `${event?.title ?? "Event"} — ${name ?? existing.name}`, metadata: { eventId: String(existing.eventId) } });
          stripeProductId = prod.id;
        }
        if (stripePriceId) { await stripe.prices.update(stripePriceId, { active: false }); }
        const np = await stripe.prices.create({ product: stripeProductId, unit_amount: priceInPence, currency: "gbp" });
        stripePriceId = np.id;
      } catch (err) { console.error("Stripe error updating ticket type:", err); }
    } else {
      if (stripePriceId) { try { const stripe = await getUncachableStripeClient(); await stripe.prices.update(stripePriceId, { active: false }); } catch {} }
      stripePriceId = null;
      stripeProductId = null;
    }
  }

  const [updated] = await db.update(ticketTypesTable).set({
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description: description || null }),
    price: priceInPence,
    ...(quantity !== undefined && { quantity: quantity ? Number(quantity) : null }),
    ...(maxPerOrder !== undefined && { maxPerOrder: maxPerOrder ? Number(maxPerOrder) : null }),
    ...(saleStartsAt !== undefined && { saleStartsAt: saleStartsAt ? new Date(saleStartsAt) : null }),
    ...(saleEndsAt !== undefined && { saleEndsAt: saleEndsAt ? new Date(saleEndsAt) : null }),
    ...(isActive !== undefined && { isActive }),
    ...(sortOrder !== undefined && { sortOrder }),
    stripeProductId,
    stripePriceId,
  }).where(eq(ticketTypesTable.id, id)).returning();
  res.json(toTicketType(updated));
});

router.delete("/ticket-types/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [type] = await db.select().from(ticketTypesTable).where(eq(ticketTypesTable.id, id)).limit(1);
  if (!type) { res.status(404).json({ error: "Not found" }); return; }
  if (type.stripePriceId) {
    try { const stripe = await getUncachableStripeClient(); await stripe.prices.update(type.stripePriceId, { active: false }); } catch {}
  }
  await db.delete(ticketTypesTable).where(eq(ticketTypesTable.id, id));
  res.json({ ok: true });
});

/* ========== DISCOUNT CODES ========== */

function toDiscountCode(c: typeof discountCodesTable.$inferSelect) {
  return {
    id: c.id,
    eventId: c.eventId ?? null,
    code: c.code,
    discountType: c.discountType,
    discountAmount: c.discountAmount,
    maxUses: c.maxUses ?? null,
    usesCount: c.usesCount,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/events/:id/discount-codes", async (req, res) => {
  const eventId = Number(req.params.id);
  const codes = await db.select().from(discountCodesTable)
    .where(eq(discountCodesTable.eventId, eventId))
    .orderBy(desc(discountCodesTable.createdAt));
  res.json(codes.map(toDiscountCode));
});

router.post("/events/:id/discount-codes", async (req, res) => {
  const eventId = Number(req.params.id);
  const { code, discountType, discountAmount, maxUses, expiresAt, isActive } = req.body;
  if (!code || !discountType || discountAmount === undefined) { res.status(400).json({ error: "code, discountType, discountAmount required" }); return; }
  if (!["percent", "fixed"].includes(discountType)) { res.status(400).json({ error: "discountType must be 'percent' or 'fixed'" }); return; }

  const amount = discountType === "percent" ? Number(discountAmount) : Math.round(Number(discountAmount) * 100);
  try {
    const [dc] = await db.insert(discountCodesTable).values({
      eventId,
      code: (code as string).toUpperCase().trim(),
      discountType,
      discountAmount: amount,
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive !== false,
    }).returning();
    res.status(201).json(toDiscountCode(dc));
  } catch (err: any) {
    if (err.code === "23505") { res.status(409).json({ error: "That discount code already exists" }); }
    else { throw err; }
  }
});

router.put("/discount-codes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { code, discountType, discountAmount, maxUses, expiresAt, isActive } = req.body;
  const [existing] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const resolvedType = discountType ?? existing.discountType;
  const amount = discountAmount !== undefined
    ? (resolvedType === "percent" ? Number(discountAmount) : Math.round(Number(discountAmount) * 100))
    : existing.discountAmount;
  try {
    const [updated] = await db.update(discountCodesTable).set({
      ...(code !== undefined && { code: (code as string).toUpperCase().trim() }),
      ...(discountType !== undefined && { discountType }),
      discountAmount: amount,
      ...(maxUses !== undefined && { maxUses: maxUses ? Number(maxUses) : null }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      ...(isActive !== undefined && { isActive }),
    }).where(eq(discountCodesTable.id, id)).returning();
    res.json(toDiscountCode(updated));
  } catch (err: any) {
    if (err.code === "23505") { res.status(409).json({ error: "That discount code already exists" }); }
    else { throw err; }
  }
});

router.delete("/discount-codes/:id", async (req, res) => {
  await db.delete(discountCodesTable).where(eq(discountCodesTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

export default router;
