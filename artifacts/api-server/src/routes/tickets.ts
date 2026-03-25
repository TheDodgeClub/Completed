import { Router, type IRouter } from "express";
import { db, ticketsTable, eventsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import crypto from "crypto";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function generateTicketCode(): string {
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

/* GET /api/tickets/config — return publishable key for client */
router.get("/config", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (err: any) {
    res.status(500).json({ error: "Stripe not configured" });
  }
});

/* GET /api/tickets/my — list tickets for the logged-in user */
router.get("/my", requireAuth, async (req: any, res) => {
  const userId = req.session.userId;
  const tickets = await db
    .select({
      id: ticketsTable.id,
      eventId: ticketsTable.eventId,
      status: ticketsTable.status,
      ticketCode: ticketsTable.ticketCode,
      checkedIn: ticketsTable.checkedIn,
      checkedInAt: ticketsTable.checkedInAt,
      amountPaid: ticketsTable.amountPaid,
      createdAt: ticketsTable.createdAt,
      eventTitle: eventsTable.title,
      eventDate: eventsTable.date,
      eventLocation: eventsTable.location,
      eventImageUrl: eventsTable.imageUrl,
    })
    .from(ticketsTable)
    .innerJoin(eventsTable, eq(ticketsTable.eventId, eventsTable.id))
    .where(and(eq(ticketsTable.userId, userId), eq(ticketsTable.status, "paid")))
    .orderBy(eventsTable.date);
  res.json(tickets);
});

/* GET /api/tickets/event/:eventId — check if user has a ticket for this event */
router.get("/event/:eventId", requireAuth, async (req: any, res) => {
  const userId = req.session.userId;
  const eventId = Number(req.params.eventId);
  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.userId, userId),
        eq(ticketsTable.eventId, eventId),
        eq(ticketsTable.status, "paid"),
      ),
    )
    .limit(1);
  res.json({ ticket: ticket ?? null });
});

/* POST /api/tickets/checkout — create Stripe Checkout Session */
router.post("/checkout", requireAuth, async (req: any, res) => {
  const userId = req.session.userId;
  const { eventId, checkoutData } = req.body as { eventId?: number; checkoutData?: Record<string, string> };
  if (!eventId) {
    res.status(400).json({ error: "eventId required" });
    return;
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (!event.stripePriceId) {
    res.status(400).json({ error: "This event does not have tickets configured yet" });
    return;
  }

  // Check if user already has a paid ticket
  const [existing] = await db
    .select()
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.userId, userId),
        eq(ticketsTable.eventId, eventId),
        eq(ticketsTable.status, "paid"),
      ),
    )
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "You already have a ticket for this event" });
    return;
  }

  // Get/create Stripe customer
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const stripe = await getUncachableStripeClient();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: String(userId) },
    });
    customerId = customer.id;
    await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, userId));
  }

  // Resolve base URL from request
  const baseUrl =
    process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : `${req.protocol}://${req.get("host")}`;

  // Clean up any old pending tickets for this user/event (abandoned sessions)
  await db.delete(ticketsTable).where(
    and(
      eq(ticketsTable.userId, userId),
      eq(ticketsTable.eventId, eventId),
      eq(ticketsTable.status, "pending"),
    ),
  );

  // Pre-create a pending ticket to store checkout form data
  const pendingCode = generateTicketCode();
  const [pendingTicket] = await db.insert(ticketsTable).values({
    userId,
    eventId,
    status: "pending",
    ticketCode: pendingCode,
    amountPaid: 0,
    checkoutData: checkoutData ?? null,
  }).returning();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: event.stripePriceId, quantity: 1 }],
    mode: "payment",
    success_url: `${baseUrl}/api/tickets/success?session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}`,
    cancel_url: `${baseUrl}/api/tickets/cancel`,
    metadata: { userId: String(userId), eventId: String(eventId), ticketId: String(pendingTicket.id) },
  });

  // Link the session to the pending ticket
  await db.update(ticketsTable)
    .set({ stripeCheckoutSessionId: session.id })
    .where(eq(ticketsTable.id, pendingTicket.id));

  res.json({ url: session.url, sessionId: session.id });
});

/* GET /api/tickets/success — redirect after successful payment */
router.get("/success", async (req, res) => {
  const { session_id, eventId } = req.query as { session_id?: string; eventId?: string };
  if (!session_id || !eventId) {
    res.status(400).send("Invalid request");
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      const userId = Number(session.metadata?.userId);
      const evId = Number(eventId);

      // Find the pending ticket linked to this session
      const [existingBySession] = await db
        .select()
        .from(ticketsTable)
        .where(eq(ticketsTable.stripeCheckoutSessionId, session_id))
        .limit(1);

      if (existingBySession) {
        // Update pending → paid if not already done
        if (existingBySession.status !== "paid") {
          await db.update(ticketsTable)
            .set({
              status: "paid",
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
              amountPaid: session.amount_total ?? 0,
            })
            .where(eq(ticketsTable.id, existingBySession.id));
        }
      } else {
        // Fallback: create fresh if no pending ticket was found
        await db.insert(ticketsTable).values({
          userId,
          eventId: evId,
          stripeCheckoutSessionId: session_id,
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
          status: "paid",
          ticketCode: generateTicketCode(),
          amountPaid: session.amount_total ?? 0,
        });
      }
    }
  } catch (err) {
    console.error("Error issuing ticket after payment:", err);
  }

  // Redirect back to the app — deep link into the member tickets screen
  res.redirect(`https://${process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost"}/mobile/?ticketSuccess=1&eventId=${eventId}`);
});

/* GET /api/tickets/cancel */
router.get("/cancel", (_req, res) => {
  res.redirect(`https://${process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost"}/mobile/?ticketCancelled=1`);
});

/* POST /api/tickets/free — issue a free ticket immediately */
router.post("/free", requireAuth, async (req: any, res) => {
  const userId = req.session.userId;
  const { eventId, checkoutData } = req.body as { eventId?: number; checkoutData?: Record<string, string> };
  if (!eventId) {
    res.status(400).json({ error: "eventId required" });
    return;
  }
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const isFree = !event.ticketPrice || Number(event.ticketPrice) === 0;
  if (!isFree) {
    res.status(400).json({ error: "This is not a free event" });
    return;
  }
  const [existing] = await db
    .select()
    .from(ticketsTable)
    .where(and(eq(ticketsTable.userId, userId), eq(ticketsTable.eventId, eventId)))
    .limit(1);
  if (existing) {
    res.json({ ticket: existing });
    return;
  }
  const [ticket] = await db
    .insert(ticketsTable)
    .values({ userId, eventId, status: "paid", ticketCode: generateTicketCode(), amountPaid: 0, checkoutData: checkoutData ?? null })
    .returning();
  res.status(201).json({ ticket });
});

export default router;
