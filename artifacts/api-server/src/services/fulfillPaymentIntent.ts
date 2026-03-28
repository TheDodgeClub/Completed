import { db, ticketsTable, eventsTable, usersTable, ticketTypesTable, discountCodesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { sendTicketConfirmationEmail } from "./email";
import { logger } from "../lib/logger";
import crypto from "crypto";

function generateTicketCode(): string {
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

export type FulfillmentResult =
  | { outcome: "fulfilled"; ticketId: number }
  | { outcome: "already_paid"; ticketId: number }
  | { outcome: "not_found" }
  | { outcome: "user_mismatch" }
  | { outcome: "missing_metadata" };

/**
 * Idempotent payment fulfillment shared by both the mobile confirm-payment
 * endpoint and the payment_intent.succeeded webhook.
 *
 * Uses an atomic WHERE status='pending' update so concurrent calls cannot
 * both proceed — only the first writer advances the ticket to 'paid' and
 * issues side effects; all subsequent calls return 'already_paid'.
 */
export async function fulfillPaymentIntent(pi: {
  id: string;
  status: string;
  amount: number;
  metadata: Record<string, string>;
  userId?: number;
}): Promise<FulfillmentResult> {
  if (pi.status !== "succeeded") {
    return { outcome: "missing_metadata" };
  }

  const ticketId = pi.metadata?.ticketId ? Number(pi.metadata.ticketId) : null;
  const eventId = pi.metadata?.eventId ? Number(pi.metadata.eventId) : null;
  const metaUserId = pi.metadata?.userId ? Number(pi.metadata.userId) : null;

  if (!ticketId || !eventId || !metaUserId) {
    logger.warn({ piId: pi.id }, "fulfillPaymentIntent: missing metadata — skipping");
    return { outcome: "missing_metadata" };
  }

  // If caller supplies userId (confirm-payment route), verify it matches metadata
  if (pi.userId !== undefined && pi.userId !== metaUserId) {
    return { outcome: "user_mismatch" };
  }

  const quantity = Math.max(1, Math.min(10, parseInt(pi.metadata?.quantity ?? "1") || 1));
  const discountCodeId = pi.metadata?.discountCodeId ? Number(pi.metadata.discountCodeId) : null;
  const ticketTypeId = pi.metadata?.ticketTypeId ? Number(pi.metadata.ticketTypeId) : null;
  const perTicketAmount = quantity > 0 ? Math.round(pi.amount / quantity) : pi.amount;

  // Verify the anchor ticket exists
  const [existing] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId))
    .limit(1);

  if (!existing) {
    logger.warn({ ticketId, piId: pi.id }, "fulfillPaymentIntent: ticket row not found");
    return { outcome: "not_found" };
  }

  if (existing.status === "paid") {
    logger.info({ ticketId, piId: pi.id }, "fulfillPaymentIntent: already fulfilled — idempotent");
    return { outcome: "already_paid", ticketId };
  }

  // Atomic: only update if still pending — prevents double-fulfillment race
  const updated = await db
    .update(ticketsTable)
    .set({ status: "paid", amountPaid: perTicketAmount, stripePaymentIntentId: pi.id })
    .where(and(eq(ticketsTable.id, ticketId), eq(ticketsTable.status, "pending")))
    .returning({ id: ticketsTable.id });

  if (updated.length === 0) {
    // Another concurrent path already confirmed this ticket
    logger.info({ ticketId, piId: pi.id }, "fulfillPaymentIntent: concurrent update detected — idempotent");
    return { outcome: "already_paid", ticketId };
  }

  // Create additional tickets for quantity > 1
  const additionalCodes: string[] = [];
  if (quantity > 1) {
    const vals = Array.from({ length: quantity - 1 }, () => ({
      userId: metaUserId,
      eventId,
      status: "paid" as const,
      ticketCode: generateTicketCode(),
      amountPaid: perTicketAmount,
      stripePaymentIntentId: pi.id,
      ticketTypeId,
      discountCodeId,
    }));
    const extras = await db
      .insert(ticketsTable)
      .values(vals)
      .returning({ ticketCode: ticketsTable.ticketCode });
    additionalCodes.push(...extras.map((t) => t.ticketCode));
  }

  // Update discount code usage
  if (discountCodeId) {
    await db
      .update(discountCodesTable)
      .set({ usesCount: sql`${discountCodesTable.usesCount} + ${quantity}` })
      .where(eq(discountCodesTable.id, discountCodeId));
  }

  // Update ticket type sold count
  if (ticketTypeId) {
    await db
      .update(ticketTypesTable)
      .set({ quantitySold: sql`${ticketTypesTable.quantitySold} + ${quantity}` })
      .where(eq(ticketTypesTable.id, ticketTypeId));
  }

  // Send confirmation email (fire-and-forget)
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, metaUserId)).limit(1);
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (user && event) {
    const allCodes = [existing.ticketCode, ...additionalCodes];
    sendTicketConfirmationEmail({
      toEmail: user.email,
      toName: user.name ?? user.email,
      eventName: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      ticketCodes: allCodes,
      eventConfig: event,
    }).catch((e: unknown) =>
      logger.error({ err: e }, "[email] confirmation send error")
    );
  }

  logger.info({ ticketId, piId: pi.id, metaUserId, eventId }, "fulfillPaymentIntent: fulfilled");
  return { outcome: "fulfilled", ticketId };
}
