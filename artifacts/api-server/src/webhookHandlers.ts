import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { logger } from "./lib/logger";
import { db, ticketsTable, eventsTable, usersTable, ticketTypesTable, discountCodesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { sendTicketConfirmationEmail } from "./services/email";
import crypto from "crypto";

function generateTicketCode(): string {
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

async function fulfillPaymentIntent(pi: {
  id: string;
  status: string;
  amount: number;
  metadata: Record<string, string>;
}): Promise<void> {
  if (pi.status !== "succeeded") return;

  const ticketId = pi.metadata?.ticketId ? Number(pi.metadata.ticketId) : null;
  const eventId = pi.metadata?.eventId ? Number(pi.metadata.eventId) : null;
  const userId = pi.metadata?.userId ? Number(pi.metadata.userId) : null;
  if (!ticketId || !eventId || !userId) {
    logger.warn({ piId: pi.id }, "payment_intent.succeeded: missing metadata — skipping fulfillment");
    return;
  }

  const quantity = Math.max(1, Math.min(10, parseInt(pi.metadata?.quantity ?? "1") || 1));
  const discountCodeId = pi.metadata?.discountCodeId ? Number(pi.metadata.discountCodeId) : null;
  const ticketTypeId = pi.metadata?.ticketTypeId ? Number(pi.metadata.ticketTypeId) : null;
  const perTicketAmount = quantity > 0 ? Math.round(pi.amount / quantity) : pi.amount;

  // Idempotency: skip if already paid
  const [existing] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId)).limit(1);
  if (!existing) {
    logger.warn({ ticketId, piId: pi.id }, "payment_intent.succeeded: ticket row not found — skipping");
    return;
  }
  if (existing.status === "paid") {
    logger.info({ ticketId, piId: pi.id }, "payment_intent.succeeded: already fulfilled — idempotent skip");
    return;
  }

  // Confirm the pending ticket
  await db.update(ticketsTable).set({
    status: "paid",
    amountPaid: perTicketAmount,
    stripePaymentIntentId: pi.id,
  }).where(and(eq(ticketsTable.id, ticketId), eq(ticketsTable.userId, userId)));

  // Create additional tickets for quantity > 1
  const additionalCodes: string[] = [];
  if (quantity > 1) {
    const vals = Array.from({ length: quantity - 1 }, () => ({
      userId, eventId, status: "paid" as const,
      ticketCode: generateTicketCode(), amountPaid: perTicketAmount,
      stripePaymentIntentId: pi.id,
      ticketTypeId, discountCodeId,
    }));
    const extras = await db.insert(ticketsTable).values(vals).returning({ ticketCode: ticketsTable.ticketCode });
    additionalCodes.push(...extras.map((t) => t.ticketCode));
  }

  // Update discount code usage
  if (discountCodeId) {
    const [dc] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.id, discountCodeId)).limit(1);
    if (dc) {
      await db.update(discountCodesTable)
        .set({ usesCount: dc.usesCount + quantity })
        .where(eq(discountCodesTable.id, discountCodeId));
    }
  }

  // Update ticket type sold count
  if (ticketTypeId) {
    await db.update(ticketTypesTable)
      .set({ quantitySold: sql`${ticketTypesTable.quantitySold} + ${quantity}` })
      .where(eq(ticketTypesTable.id, ticketTypeId));
  }

  // Send confirmation email
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (user && event && existing) {
    const allCodes = [existing.ticketCode, ...additionalCodes];
    sendTicketConfirmationEmail({
      toEmail: user.email,
      toName: user.name ?? user.email,
      eventName: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      ticketCodes: allCodes,
      eventConfig: event,
    }).catch((e) => logger.error({ err: e }, "[email] webhook confirmation send error"));
  }

  logger.info({ ticketId, piId: pi.id, userId, eventId }, "payment_intent.succeeded: ticket fulfilled via webhook");
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "This usually means express.json() parsed the body before reaching this handler. " +
          "FIX: Ensure webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    let event: { type: string; data: { object: Record<string, unknown> } } | null = null;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret) {
      try {
        const stripe = await getUncachableStripeClient();
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret) as typeof event;
      } catch (err: unknown) {
        logger.warn({ err }, "Stripe webhook signature verification failed");
        throw err;
      }
    } else {
      try {
        event = JSON.parse(payload.toString()) as typeof event;
      } catch {
        logger.warn("Failed to parse Stripe webhook payload");
      }
    }

    // Handle payment_intent.succeeded as a reliable server-side fulfillment fallback
    if (event?.type === "payment_intent.succeeded") {
      const pi = event.data.object as {
        id: string;
        status: string;
        amount: number;
        metadata: Record<string, string>;
      };
      await fulfillPaymentIntent(pi).catch((err: unknown) => {
        logger.error({ err, piId: pi.id }, "payment_intent.succeeded fulfillment error");
      });
    }

    // Delegate to StripeSync (Replit connector)
    try {
      const sync = await getStripeSync();
      await sync.processWebhook(payload, signature);
    } catch (err: unknown) {
      logger.debug({ err: (err as Error)?.message }, "StripeSync processWebhook skipped");
    }
  }
}
