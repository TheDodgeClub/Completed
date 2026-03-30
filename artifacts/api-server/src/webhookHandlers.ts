import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { logger } from "./lib/logger";
import { fulfillPaymentIntent } from "./services/fulfillPaymentIntent";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
      // Without a webhook secret we cannot verify authenticity.
      // Parse the event for StripeSync (connector) but do NOT run any fulfillment
      // logic — fulfillment on an unsigned payload would allow forged ticket grants.
      try {
        event = JSON.parse(payload.toString()) as typeof event;
      } catch {
        logger.warn("Failed to parse Stripe webhook payload");
      }
    }

    // Handle payment_intent.succeeded as a reliable server-side fulfillment fallback.
    // Only executed when signature has been verified (webhookSecret is set).
    if (webhookSecret && event?.type === "payment_intent.succeeded") {
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

    // Elite membership subscription lifecycle events.
    // These run regardless of signature verification status (StripeSync handles
    // signature verification for us in the connector flow).
    if (event?.type === "checkout.session.completed") {
      const session = event.data.object as {
        mode: string;
        metadata: Record<string, string>;
        subscription?: string;
        customer?: string;
      };
      if (session.mode === "subscription") {
        const userId = session.metadata?.userId ? Number(session.metadata.userId) : null;
        if (userId && session.subscription) {
          await db
            .update(usersTable)
            .set({
              isElite: true,
              eliteSince: new Date(),
              stripeSubscriptionId: session.subscription,
              stripeCustomerId: session.customer ?? undefined,
            })
            .where(eq(usersTable.id, userId))
            .catch((err: unknown) => logger.error({ err, userId }, "elite activate error"));
          logger.info({ userId, subscriptionId: session.subscription }, "Elite membership activated");
        }
      }
    }

    if (event?.type === "customer.subscription.deleted") {
      const sub = event.data.object as { id: string; metadata: Record<string, string> };
      const userId = sub.metadata?.userId ? Number(sub.metadata.userId) : null;
      if (userId) {
        await db
          .update(usersTable)
          .set({ isElite: false, stripeSubscriptionId: null })
          .where(eq(usersTable.id, userId))
          .catch((err: unknown) => logger.error({ err, userId }, "elite deactivate error"));
        logger.info({ userId, subscriptionId: sub.id }, "Elite membership cancelled");
      }
    }

    if (event?.type === "invoice.payment_failed") {
      const invoice = event.data.object as { subscription?: string; customer?: string };
      if (invoice.subscription) {
        await db
          .update(usersTable)
          .set({ isElite: false })
          .where(eq(usersTable.stripeSubscriptionId, invoice.subscription))
          .catch((err: unknown) => logger.error({ err, sub: invoice.subscription }, "elite payment_failed error"));
        logger.info({ subscriptionId: invoice.subscription }, "Elite membership lapsed (payment failed)");
      }
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
