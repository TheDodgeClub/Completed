import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";

async function handleSubscriptionEvent(event: { type: string; data: { object: any } }) {
  const sub = event.data.object;
  if (event.type === "customer.subscription.deleted") {
    await db
      .update(usersTable)
      .set({ isElite: false, stripeSubscriptionId: null })
      .where(eq(usersTable.stripeSubscriptionId, sub.id));
    logger.info({ subscriptionId: sub.id }, "Elite subscription deleted — status revoked");
  } else if (event.type === "customer.subscription.updated") {
    const isActive = sub.status === "active" || sub.status === "trialing";
    await db
      .update(usersTable)
      .set({ isElite: isActive })
      .where(eq(usersTable.stripeSubscriptionId, sub.id));
    logger.info({ subscriptionId: sub.id, isActive }, "Elite subscription updated");
  } else if (event.type === "customer.subscription.created") {
    // Belt-and-braces: also handled by /api/elite/success redirect
    const isActive = sub.status === "active" || sub.status === "trialing";
    if (isActive) {
      // Only grant bonus XP if user isn't already Elite (first-time signup)
      const [existing] = await db
        .select({ isElite: usersTable.isElite })
        .from(usersTable)
        .where(eq(usersTable.stripeSubscriptionId, sub.id))
        .limit(1);
      await db
        .update(usersTable)
        .set({ isElite: true, ...(!existing?.isElite ? { bonusXp: 500 } : {}) })
        .where(eq(usersTable.stripeSubscriptionId, sub.id));
    }
  }
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

    // Parse the raw event for subscription handling
    let event: { type: string; data: { object: any } } | null = null;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret) {
      // Verify signature if webhook secret is configured
      try {
        const stripe = await getUncachableStripeClient();
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret) as any;
      } catch (err: any) {
        logger.warn({ err }, "Stripe webhook signature verification failed");
        throw err;
      }
    } else {
      // No secret configured — parse without verification (dev mode only)
      try {
        event = JSON.parse(payload.toString());
      } catch {
        logger.warn("Failed to parse Stripe webhook payload");
      }
    }

    // Handle subscription lifecycle events
    if (event && (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created"
    )) {
      try {
        await handleSubscriptionEvent(event);
      } catch (err) {
        logger.error({ err }, "Failed to handle subscription event");
      }
    }

    // Also delegate to StripeSync (Replit connector) — wrapped in try-catch
    // so subscription handling still works even if sync is unavailable
    try {
      const sync = await getStripeSync();
      await sync.processWebhook(payload, signature);
    } catch (err: any) {
      // StripeSync may fail when using own API keys rather than Replit connector
      logger.debug({ err: err?.message }, "StripeSync processWebhook skipped");
    }
  }
}
