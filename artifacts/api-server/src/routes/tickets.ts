import { Router, type IRouter } from "express";
import { db, ticketsTable, eventsTable, usersTable, ticketTypesTable, discountCodesTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import { sendTicketConfirmationEmail, sendGiftEmail } from "../services/email";
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

/* GET /api/tickets/config */
router.get("/config", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch {
    res.status(500).json({ error: "Stripe not configured" });
  }
});

/* GET /api/tickets/my */
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
      originalAmountPaid: ticketsTable.originalAmountPaid,
      ticketTypeId: ticketsTable.ticketTypeId,
      createdAt: ticketsTable.createdAt,
      eventTitle: eventsTable.title,
      eventDate: eventsTable.date,
      eventLocation: eventsTable.location,
      eventImageUrl: eventsTable.imageUrl,
      eventXpReward: eventsTable.xpReward,
    })
    .from(ticketsTable)
    .innerJoin(eventsTable, eq(ticketsTable.eventId, eventsTable.id))
    .where(and(eq(ticketsTable.userId, userId), eq(ticketsTable.status, "paid")))
    .orderBy(eventsTable.date);

  // Enrich with ticket type names
  const typeIds = [...new Set(tickets.map(t => t.ticketTypeId).filter(Boolean))];
  const types = typeIds.length > 0
    ? await db.select({ id: ticketTypesTable.id, name: ticketTypesTable.name })
        .from(ticketTypesTable)
        .where(inArray(ticketTypesTable.id, typeIds as number[]))
    : [];
  const typeMap = Object.fromEntries(types.map(t => [t.id, t.name]));

  res.json(tickets.map(t => ({ ...t, ticketTypeName: t.ticketTypeId ? (typeMap[t.ticketTypeId] ?? null) : null })));
});

/* GET /api/tickets/event/:eventId */
router.get("/event/:eventId", requireAuth, async (req: any, res) => {
  const userId = req.session.userId;
  const eventId = Number(req.params.eventId);
  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(and(eq(ticketsTable.userId, userId), eq(ticketsTable.eventId, eventId), eq(ticketsTable.status, "paid")))
    .limit(1);
  res.json({ ticket: ticket ?? null });
});

/* GET /api/tickets/validate-code — validate a discount code */
router.get("/validate-code", requireAuth, async (req: any, res) => {
  const { eventId, code } = req.query as { eventId?: string; code?: string };
  if (!eventId || !code) { res.status(400).json({ error: "eventId and code required" }); return; }

  const [dc] = await db.select().from(discountCodesTable)
    .where(and(eq(discountCodesTable.code, code.toUpperCase().trim()), eq(discountCodesTable.isActive, true)))
    .limit(1);

  if (!dc) { res.status(404).json({ error: "Invalid or inactive discount code" }); return; }
  if (dc.eventId !== null && dc.eventId !== Number(eventId)) { res.status(400).json({ error: "This code is not valid for this event" }); return; }
  if (dc.expiresAt && new Date() > dc.expiresAt) { res.status(400).json({ error: "This discount code has expired" }); return; }
  if (dc.maxUses !== null && dc.usesCount >= dc.maxUses) { res.status(400).json({ error: "This discount code has reached its maximum uses" }); return; }

  res.json({ valid: true, discountType: dc.discountType, discountAmount: dc.discountAmount, code: dc.code });
});

/* POST /api/tickets/checkout */
router.post("/checkout", requireAuth, async (req: any, res) => {
  const userId = req.session.userId;
  const { eventId, checkoutData, ticketTypeId, discountCode, quantity: rawQuantity } = req.body as {
    eventId?: number; checkoutData?: Record<string, string>;
    ticketTypeId?: number; discountCode?: string; quantity?: number;
  };
  if (!eventId) { res.status(400).json({ error: "eventId required" }); return; }
  const quantity = Math.max(1, Math.min(10, Number(rawQuantity) || 1));

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  // Server-side waiver enforcement
  if (event.waiverText && checkoutData?.__waiver_signed !== "true") {
    res.status(400).json({ error: "You must sign the waiver before purchasing a ticket." });
    return;
  }

  // Resolve ticket type
  let resolvedStripePriceId = event.stripePriceId;
  let resolvedStripeProductId = event.stripeProductId;
  let baseAmountPence = event.ticketPrice ? Math.round(Number(event.ticketPrice) * 100) : 0;
  let resolvedTicketTypeId: number | null = null;
  let resolvedTicketTypeName: string | null = null;

  if (ticketTypeId) {
    const [tt] = await db.select().from(ticketTypesTable).where(eq(ticketTypesTable.id, Number(ticketTypeId))).limit(1);
    if (!tt || tt.eventId !== eventId) { res.status(400).json({ error: "Invalid ticket type" }); return; }
    if (!tt.isActive) { res.status(400).json({ error: "This ticket type is not available" }); return; }
    if (tt.quantity !== null && tt.quantitySold >= tt.quantity) { res.status(409).json({ error: "This ticket type is sold out" }); return; }
    const now = new Date();
    if (tt.saleStartsAt && now < tt.saleStartsAt) { res.status(400).json({ error: "Sales for this ticket type have not started yet" }); return; }
    if (tt.saleEndsAt && now > tt.saleEndsAt) { res.status(400).json({ error: "Sales for this ticket type have ended" }); return; }
    if (tt.maxPerOrder !== null && quantity > tt.maxPerOrder) { res.status(400).json({ error: `You can only buy up to ${tt.maxPerOrder} ticket${tt.maxPerOrder !== 1 ? "s" : ""} per order for this ticket type.` }); return; }
    if (tt.quantity !== null) {
      const remaining = tt.quantity - tt.quantitySold;
      if (quantity > remaining) { res.status(409).json({ error: remaining <= 0 ? "Sorry, this ticket type is sold out." : `Only ${remaining} ticket${remaining !== 1 ? "s" : ""} remaining for this type.` }); return; }
    }
    resolvedStripePriceId = tt.stripePriceId;
    resolvedStripeProductId = tt.stripeProductId;
    baseAmountPence = tt.price;
    resolvedTicketTypeId = tt.id;
    resolvedTicketTypeName = tt.name;
  }

  // Validate discount code
  let finalAmountPence = baseAmountPence;
  let discountCodeRecord: typeof discountCodesTable.$inferSelect | null = null;

  if (discountCode && baseAmountPence > 0) {
    const [dc] = await db.select().from(discountCodesTable)
      .where(and(eq(discountCodesTable.code, discountCode.toUpperCase().trim()), eq(discountCodesTable.isActive, true)))
      .limit(1);
    if (!dc) { res.status(400).json({ error: "Invalid or inactive discount code" }); return; }
    if (dc.eventId !== null && dc.eventId !== eventId) { res.status(400).json({ error: "This code is not valid for this event" }); return; }
    if (dc.expiresAt && new Date() > dc.expiresAt) { res.status(400).json({ error: "This discount code has expired" }); return; }
    if (dc.maxUses !== null && dc.usesCount >= dc.maxUses) { res.status(400).json({ error: "This discount code has reached its maximum uses" }); return; }
    discountCodeRecord = dc;
    if (dc.discountType === "percent") {
      finalAmountPence = Math.round(baseAmountPence * (1 - dc.discountAmount / 100));
    } else {
      finalAmountPence = Math.max(0, baseAmountPence - dc.discountAmount);
    }
  }

  // If free (after discount or originally free), issue immediately
  if (finalAmountPence === 0) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const ticketValues = Array.from({ length: quantity }, () => ({
      userId, eventId, status: "paid" as const, ticketCode: generateTicketCode(), amountPaid: 0,
      originalAmountPaid: baseAmountPence > 0 ? 0 : undefined,
      checkoutData: checkoutData ?? null,
      ticketTypeId: resolvedTicketTypeId,
      discountCodeId: discountCodeRecord?.id ?? null,
    }));
    const tickets = await db.insert(ticketsTable).values(ticketValues).returning();
    const [ticket] = tickets;

    if (discountCodeRecord) {
      await db.update(discountCodesTable).set({ usesCount: discountCodeRecord.usesCount + quantity }).where(eq(discountCodesTable.id, discountCodeRecord.id));
    }
    if (resolvedTicketTypeId) {
      await db.update(ticketTypesTable).set({ quantitySold: sql`${ticketTypesTable.quantitySold} + ${quantity}` }).where(eq(ticketTypesTable.id, resolvedTicketTypeId));
    }

    if (user) {
      sendTicketConfirmationEmail({ toEmail: user.email, toName: user.name ?? user.email, eventName: event.title, eventDate: event.date, eventLocation: event.location, ticketCodes: tickets.map(t => t.ticketCode), eventConfig: event }).catch(e => console.error("[email] send error:", e));
    }
    res.status(201).json({ ticket, free: true });
    return;
  }

  // Paid — ensure we have a stripe product/price OR at least a ticket type with a price we can use
  if (!resolvedStripePriceId && !resolvedStripeProductId && !resolvedTicketTypeId && !baseAmountPence) {
    res.status(400).json({ error: "This event does not have tickets configured yet" });
    return;
  }

  // Get/create Stripe customer
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const stripe = await getUncachableStripeClient();
  const isValidEmail = (e: string | null) => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  let customerId = user.stripeCustomerId;
  if (customerId) {
    try {
      const existing = await stripe.customers.retrieve(customerId);
      if ((existing as any).deleted) customerId = null;
    } catch (err: any) {
      if (err?.code === "resource_missing") {
        customerId = null;
        await db.update(usersTable).set({ stripeCustomerId: null }).where(eq(usersTable.id, userId));
      } else { throw err; }
    }
  }
  if (!customerId) {
    const customer = await stripe.customers.create({
      ...(isValidEmail(user.email) ? { email: user.email! } : {}),
      ...(user.name ? { name: user.name } : {}),
      metadata: { userId: String(userId) },
    });
    customerId = customer.id;
    await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, userId));
  }

  const baseUrl = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : `${req.protocol}://${req.get("host")}`;

  // Clean up old pending tickets
  await db.delete(ticketsTable).where(and(eq(ticketsTable.userId, userId), eq(ticketsTable.eventId, eventId), eq(ticketsTable.status, "pending")));

  // Pre-create pending ticket
  const pendingCode = generateTicketCode();
  const [pendingTicket] = await db.insert(ticketsTable).values({
    userId, eventId, status: "pending", ticketCode: pendingCode, amountPaid: 0,
    checkoutData: checkoutData ?? null,
    ticketTypeId: resolvedTicketTypeId,
    discountCodeId: discountCodeRecord?.id ?? null,
    originalAmountPaid: discountCodeRecord ? baseAmountPence : null,
  }).returning();

  // Build Stripe session line items — use unit_amount override when discount applied or using ticket type with custom price
  const needsCustomAmount = !!discountCodeRecord || (resolvedTicketTypeId !== null && resolvedStripeProductId);

  let lineItems: any[];
  if (needsCustomAmount || !resolvedStripePriceId) {
    // Use price_data with unit_amount
    lineItems = [{
      price_data: {
        currency: "gbp",
        unit_amount: finalAmountPence,
        ...(resolvedStripeProductId
          ? { product: resolvedStripeProductId }
          : { product_data: { name: resolvedTicketTypeName ? `${event.title} — ${resolvedTicketTypeName}` : event.title } }),
      },
      quantity,
    }];
  } else {
    // Verify the price ID still exists
    try {
      await stripe.prices.retrieve(resolvedStripePriceId!);
    } catch (err: any) {
      if (err?.code === "resource_missing") {
        await db.update(eventsTable).set({ stripePriceId: null, stripeProductId: null }).where(eq(eventsTable.id, eventId));
        await db.delete(ticketsTable).where(eq(ticketsTable.id, pendingTicket.id));
        res.status(400).json({ error: "Ticket pricing needs to be reconfigured (Stripe account was changed)." });
        return;
      }
      throw err;
    }
    lineItems = [{ price: resolvedStripePriceId, quantity }];
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${baseUrl}/api/tickets/success?session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}`,
    cancel_url: `${baseUrl}/api/tickets/cancel`,
    metadata: {
      userId: String(userId), eventId: String(eventId), ticketId: String(pendingTicket.id),
      quantity: String(quantity),
      ...(discountCodeRecord ? { discountCodeId: String(discountCodeRecord.id) } : {}),
      ...(resolvedTicketTypeId ? { ticketTypeId: String(resolvedTicketTypeId) } : {}),
    },
  });

  await db.update(ticketsTable).set({ stripeCheckoutSessionId: session.id }).where(eq(ticketsTable.id, pendingTicket.id));
  res.json({ url: session.url, sessionId: session.id });
});

/* GET /api/tickets/success */
router.get("/success", async (req, res) => {
  const { session_id, eventId } = req.query as { session_id?: string; eventId?: string };
  if (!session_id || !eventId) { res.status(400).send("Invalid request"); return; }

  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      const userId = Number(session.metadata?.userId);
      const evId = Number(eventId);
      const discountCodeId = session.metadata?.discountCodeId ? Number(session.metadata.discountCodeId) : null;
      const ticketTypeId = session.metadata?.ticketTypeId ? Number(session.metadata.ticketTypeId) : null;
      const quantity = Math.max(1, Math.min(10, parseInt(session.metadata?.quantity ?? "1") || 1));
      const perTicketAmount = session.amount_total ? Math.round(session.amount_total / quantity) : 0;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

      const [existingBySession] = await db.select().from(ticketsTable)
        .where(eq(ticketsTable.stripeCheckoutSessionId, session_id)).limit(1);

      // Helper: create quantity-1 additional tickets linked to the same session
      const createAdditionals = async (count: number) => {
        if (count <= 0) return [] as { ticketCode: string }[];
        const vals = Array.from({ length: count }, () => ({
          userId, eventId: evId, status: "paid" as const,
          ticketCode: generateTicketCode(), amountPaid: perTicketAmount,
          stripeCheckoutSessionId: session_id, stripePaymentIntentId: paymentIntentId,
          ticketTypeId, discountCodeId,
        }));
        return db.insert(ticketsTable).values(vals).returning({ ticketCode: ticketsTable.ticketCode });
      };

      if (existingBySession) {
        if (existingBySession.status !== "paid") {
          await db.update(ticketsTable).set({
            status: "paid",
            stripePaymentIntentId: paymentIntentId,
            amountPaid: perTicketAmount,
          }).where(eq(ticketsTable.id, existingBySession.id));

          // Check how many additional tickets already exist for this session
          const alreadyCreated = await db.select().from(ticketsTable)
            .where(and(eq(ticketsTable.stripeCheckoutSessionId, session_id), eq(ticketsTable.status, "paid")));
          const additional = await createAdditionals(quantity - alreadyCreated.length);
          const allCodes = [existingBySession.ticketCode, ...additional.map(t => t.ticketCode)];

          if (discountCodeId) {
            const [dc] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.id, discountCodeId)).limit(1);
            if (dc) await db.update(discountCodesTable).set({ usesCount: dc.usesCount + quantity }).where(eq(discountCodesTable.id, discountCodeId));
          }
          if (ticketTypeId) {
            await db.update(ticketTypesTable).set({ quantitySold: sql`${ticketTypesTable.quantitySold} + ${quantity}` }).where(eq(ticketTypesTable.id, ticketTypeId));
          }

          const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
          const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, evId)).limit(1);
          if (user && event) {
            sendTicketConfirmationEmail({ toEmail: user.email, toName: user.name ?? user.email, eventName: event.title, eventDate: event.date, eventLocation: event.location, ticketCodes: allCodes, eventConfig: event }).catch(e => console.error("[email] send error:", e));
          }
        }
      } else {
        // Fallback: create all tickets fresh
        const firstCode = generateTicketCode();
        await db.insert(ticketsTable).values({
          userId, eventId: evId, stripeCheckoutSessionId: session_id,
          stripePaymentIntentId: paymentIntentId,
          status: "paid", ticketCode: firstCode, amountPaid: perTicketAmount,
          ticketTypeId, discountCodeId,
        });
        const additional = await createAdditionals(quantity - 1);
        const allCodes = [firstCode, ...additional.map(t => t.ticketCode)];

        if (discountCodeId) {
          const [dc] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.id, discountCodeId)).limit(1);
          if (dc) await db.update(discountCodesTable).set({ usesCount: dc.usesCount + quantity }).where(eq(discountCodesTable.id, discountCodeId));
        }
        if (ticketTypeId) {
          await db.update(ticketTypesTable).set({ quantitySold: sql`${ticketTypesTable.quantitySold} + ${quantity}` }).where(eq(ticketTypesTable.id, ticketTypeId));
        }
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
        const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, evId)).limit(1);
        if (user && event) {
          sendTicketConfirmationEmail({ toEmail: user.email, toName: user.name ?? user.email, eventName: event.title, eventDate: event.date, eventLocation: event.location, ticketCodes: allCodes, eventConfig: event }).catch(e => console.error("[email] send error:", e));
        }
      }
    }
  } catch (err) {
    console.error("Error issuing ticket after payment:", err);
  }

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Successful</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0D0D0D; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #1a1a1a; border-radius: 20px; padding: 40px 32px; max-width: 360px; width: 100%; text-align: center; border: 1px solid rgba(255,255,255,0.08); }
    .icon { width: 72px; height: 72px; background: #0B5E2F; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 32px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 10px; color: #fff; }
    p { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.5; margin-bottom: 28px; }
    .badge { display: inline-block; background: rgba(11,94,47,0.25); border: 1px solid #0B5E2F; color: #1A8C4E; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 28px; }
    .hint { font-size: 13px; color: rgba(255,255,255,0.35); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Payment Successful!</h1>
    <p>Your ticket has been issued. A confirmation email is on its way to you.</p>
    <div class="badge">🎟 Ticket Confirmed</div>
    <p class="hint">Press <strong>Done</strong> at the top to return to the app and view your ticket.</p>
  </div>
</body>
</html>`);
});

/* GET /api/tickets/cancel */
router.get("/cancel", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Cancelled</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0D0D0D; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #1a1a1a; border-radius: 20px; padding: 40px 32px; max-width: 360px; width: 100%; text-align: center; border: 1px solid rgba(255,255,255,0.08); }
    .icon { width: 72px; height: 72px; background: #2a1a1a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 32px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 10px; color: #fff; }
    p { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.5; margin-bottom: 28px; }
    .hint { font-size: 13px; color: rgba(255,255,255,0.35); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h1>Payment Cancelled</h1>
    <p>No charge was made. Your spot is still available — head back to try again.</p>
    <p class="hint">Press <strong>Done</strong> to return to the app.</p>
  </div>
</body>
</html>`);
});

/* POST /api/tickets/free */
router.post("/free", requireAuth, async (req: any, res) => {
  const userId = req.session.userId;
  const { eventId, checkoutData, ticketTypeId, quantity: rawQuantity } = req.body as { eventId?: number; checkoutData?: Record<string, string>; ticketTypeId?: number; quantity?: number };
  if (!eventId) { res.status(400).json({ error: "eventId required" }); return; }
  const quantity = Math.max(1, Math.min(10, Number(rawQuantity) || 1));
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  // Server-side waiver enforcement
  if (event.waiverText && checkoutData?.__waiver_signed !== "true") {
    res.status(400).json({ error: "You must sign the waiver before registering for this event." });
    return;
  }

  let resolvedTicketTypeId: number | null = null;
  let effectivelyfree = !event.ticketPrice || Number(event.ticketPrice) === 0;

  if (ticketTypeId) {
    const [tt] = await db.select().from(ticketTypesTable).where(eq(ticketTypesTable.id, Number(ticketTypeId))).limit(1);
    if (tt && tt.eventId === eventId && tt.price === 0) {
      if (tt.maxPerOrder !== null && quantity > tt.maxPerOrder) { res.status(400).json({ error: `You can only register up to ${tt.maxPerOrder} ticket${tt.maxPerOrder !== 1 ? "s" : ""} per order for this type.` }); return; }
      if (tt.quantity !== null) {
        const remaining = tt.quantity - tt.quantitySold;
        if (quantity > remaining) { res.status(409).json({ error: remaining <= 0 ? "Sorry, this ticket type is sold out." : `Only ${remaining} spot${remaining !== 1 ? "s" : ""} remaining for this type.` }); return; }
      }
      resolvedTicketTypeId = tt.id;
      effectivelyfree = true;
    }
  }

  if (!effectivelyfree) { res.status(400).json({ error: "This is not a free event" }); return; }

  const ticketValues = Array.from({ length: quantity }, () => ({
    userId, eventId, status: "paid" as const, ticketCode: generateTicketCode(), amountPaid: 0,
    checkoutData: checkoutData ?? null,
    ticketTypeId: resolvedTicketTypeId,
  }));
  const tickets = await db.insert(ticketsTable).values(ticketValues).returning();
  const [ticket] = tickets;

  if (resolvedTicketTypeId) {
    await db.update(ticketTypesTable).set({ quantitySold: sql`${ticketTypesTable.quantitySold} + ${quantity}` }).where(eq(ticketTypesTable.id, resolvedTicketTypeId));
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (user) {
    sendTicketConfirmationEmail({ toEmail: user.email, toName: user.name ?? user.email, eventName: event.title, eventDate: event.date, eventLocation: event.location, ticketCodes: tickets.map(t => t.ticketCode), eventConfig: event }).catch(e => console.error("[email] send error:", e));
  }
  res.status(201).json({ ticket });
});

/* POST /api/tickets/gift */
router.post("/gift", requireAuth, async (req: any, res) => {
  const gifterId = req.session.userId;
  const { eventId, recipientEmail } = req.body as { eventId?: number; recipientEmail?: string };
  if (!eventId || !recipientEmail) { res.status(400).json({ error: "eventId and recipientEmail are required" }); return; }
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const [gifterTicket] = await db.select().from(ticketsTable)
    .where(and(eq(ticketsTable.userId, gifterId), eq(ticketsTable.eventId, eventId), eq(ticketsTable.status, "paid")))
    .limit(1);
  if (!gifterTicket) { res.status(403).json({ error: "You need to have your own ticket before gifting one." }); return; }

  // Resolve ticket type from the gifter's ticket — gift uses the same type & price
  let giftTicketType: typeof ticketTypesTable.$inferSelect | null = null;
  if (gifterTicket.ticketTypeId) {
    const [tt] = await db.select().from(ticketTypesTable).where(eq(ticketTypesTable.id, gifterTicket.ticketTypeId)).limit(1);
    if (tt) giftTicketType = tt;
  }

  // Determine if this gift is free based on the ticket type price (or event-level price as fallback)
  const giftPricePence = giftTicketType ? giftTicketType.price : Math.round(Number(event.ticketPrice ?? 0) * 100);
  const isFree = giftPricePence === 0;

  const normalizedEmail = recipientEmail.toLowerCase();
  const [gifter] = await db.select().from(usersTable).where(eq(usersTable.id, gifterId)).limit(1);
  const gifterName = gifter?.name ?? gifter?.email ?? "A Dodge Club member";

  const baseUrl = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : (process.env.API_BASE_URL ?? "https://api.thedodgeclub.co.uk");

  const recipient = await db.query.usersTable.findFirst({ where: eq(usersTable.email, normalizedEmail) });

  if (recipient) {
    const [existing] = await db.select().from(ticketsTable)
      .where(and(eq(ticketsTable.userId, recipient.id), eq(ticketsTable.eventId, eventId), eq(ticketsTable.status, "paid")))
      .limit(1);
    if (existing) { res.status(409).json({ error: "That person already has a ticket for this event." }); return; }

    if (isFree) {
      const [ticket] = await db.insert(ticketsTable).values({ userId: recipient.id, eventId, status: "paid", ticketCode: generateTicketCode(), amountPaid: 0, ticketTypeId: giftTicketType?.id ?? null }).returning();
      sendGiftEmail({ toEmail: recipient.email, toName: recipient.name ?? recipient.email, gifterName, eventName: event.title, eventDate: event.date, eventLocation: event.location, ticketCode: ticket.ticketCode, eventConfig: event }).catch(e => console.error("[email] gift send error:", e));
      res.status(201).json({ ticket, gifted: true });
      return;
    }

    const stripe = getUncachableStripeClient();
    const lineItems = event.stripePriceId
      ? [{ price: event.stripePriceId, quantity: 1 }]
      : [{ price_data: { currency: "gbp", unit_amount: giftPricePence, ...(giftTicketType?.stripeProductId ? { product: giftTicketType.stripeProductId } : { product_data: { name: `${event.title}${giftTicketType ? ` — ${giftTicketType.name}` : ""}` } }) }, quantity: 1 }];
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${baseUrl}/api/tickets/gift-success?session_id={CHECKOUT_SESSION_ID}&recipientId=${recipient.id}&eventId=${eventId}`,
      cancel_url: `${baseUrl}/api/tickets/cancel`,
      customer_email: gifter?.email,
      metadata: { giftTicket: "true", recipientId: String(recipient.id), eventId: String(eventId), gifterName, ...(giftTicketType ? { ticketTypeId: String(giftTicketType.id) } : {}) },
    });
    res.json({ checkoutUrl: session.url });
    return;
  }

  const [existingPending] = await db.select().from(ticketsTable)
    .where(and(eq(ticketsTable.eventId, eventId), eq(ticketsTable.giftRecipientEmail as any, normalizedEmail), eq(ticketsTable.status, "paid")))
    .limit(1);
  if (existingPending) { res.status(409).json({ error: "A gift ticket has already been sent to that email address for this event." }); return; }

  if (isFree) {
    const [ticket] = await db.insert(ticketsTable).values({ userId: gifterId, eventId, status: "paid", ticketCode: generateTicketCode(), amountPaid: 0, giftRecipientEmail: normalizedEmail, ticketTypeId: giftTicketType?.id ?? null }).returning();
    sendGiftEmail({ toEmail: normalizedEmail, toName: normalizedEmail, gifterName, eventName: event.title, eventDate: event.date, eventLocation: event.location, ticketCode: ticket.ticketCode, eventConfig: event }).catch(e => console.error("[email] gift send error:", e));
    res.status(201).json({ ticket, gifted: true });
    return;
  }

  const stripe = getUncachableStripeClient();
  const lineItems = event.stripePriceId
    ? [{ price: event.stripePriceId, quantity: 1 }]
    : [{ price_data: { currency: "gbp", unit_amount: giftPricePence, ...(giftTicketType?.stripeProductId ? { product: giftTicketType.stripeProductId } : { product_data: { name: `${event.title}${giftTicketType ? ` — ${giftTicketType.name}` : ""}` } }) }, quantity: 1 }];
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${baseUrl}/api/tickets/gift-success?session_id={CHECKOUT_SESSION_ID}&gifterId=${gifterId}&recipientEmail=${encodeURIComponent(normalizedEmail)}&eventId=${eventId}`,
    cancel_url: `${baseUrl}/api/tickets/cancel`,
    customer_email: gifter?.email,
    metadata: { giftTicket: "true", gifterId: String(gifterId), recipientEmail: normalizedEmail, eventId: String(eventId), gifterName, ...(giftTicketType ? { ticketTypeId: String(giftTicketType.id) } : {}) },
  });
  res.json({ checkoutUrl: session.url });
});

/* GET /api/tickets/gift-success */
router.get("/gift-success", async (req, res) => {
  const { session_id, recipientId, recipientEmail, gifterId, eventId } = req.query as {
    session_id?: string; recipientId?: string; recipientEmail?: string; gifterId?: string; eventId?: string;
  };
  if (!session_id || !eventId) { res.status(400).send("Missing params"); return; }
  const stripe = getUncachableStripeClient();
  const session = await stripe.checkout.sessions.retrieve(session_id);
  if (session.payment_status !== "paid") { res.status(400).send("Payment not confirmed"); return; }
  const eId = Number(eventId);
  const gifterName = (session.metadata?.gifterName as string | undefined) ?? "A Dodge Club member";
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eId)).limit(1);

  if (recipientId) {
    const rId = Number(recipientId);
    const [existing] = await db.select().from(ticketsTable).where(and(eq(ticketsTable.userId, rId), eq(ticketsTable.eventId, eId))).limit(1);
    if (!existing) {
      const [ticket] = await db.insert(ticketsTable).values({ userId: rId, eventId: eId, status: "paid", ticketCode: generateTicketCode(), amountPaid: session.amount_total ?? 0, stripeCheckoutSessionId: session_id }).returning();
      const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, rId)).limit(1);
      if (recipient && event) {
        sendGiftEmail({ toEmail: recipient.email, toName: recipient.name ?? recipient.email, gifterName, eventName: event.title, eventDate: event.date, eventLocation: event.location, ticketCode: ticket.ticketCode, eventConfig: event }).catch(e => console.error("[email] gift success email error:", e));
      }
    }
  } else if (recipientEmail && gifterId) {
    const normalizedEmail = decodeURIComponent(recipientEmail).toLowerCase();
    const gId = Number(gifterId);
    const [existing] = await db.select().from(ticketsTable).where(and(eq(ticketsTable.eventId, eId), eq(ticketsTable.giftRecipientEmail as any, normalizedEmail))).limit(1);
    if (!existing) {
      const [ticket] = await db.insert(ticketsTable).values({ userId: gId, eventId: eId, status: "paid", ticketCode: generateTicketCode(), amountPaid: session.amount_total ?? 0, stripeCheckoutSessionId: session_id, giftRecipientEmail: normalizedEmail }).returning();
      if (event) {
        sendGiftEmail({ toEmail: normalizedEmail, toName: normalizedEmail, gifterName, eventName: event.title, eventDate: event.date, eventLocation: event.location, ticketCode: ticket.ticketCode, eventConfig: event }).catch(e => console.error("[email] gift success email error:", e));
      }
    }
  }
  res.redirect("thedodgeclub://gift-success");
});

export default router;
