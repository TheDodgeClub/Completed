import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { logger } from "./lib/logger";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "This usually means express.json() parsed the body before reaching this handler. " +
          "FIX: Ensure webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    let event: { type: string; data: { object: any } } | null = null;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret) {
      try {
        const stripe = await getUncachableStripeClient();
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret) as any;
      } catch (err: any) {
        logger.warn({ err }, "Stripe webhook signature verification failed");
        throw err;
      }
    } else {
      try {
        event = JSON.parse(payload.toString());
      } catch {
        logger.warn("Failed to parse Stripe webhook payload");
      }
    }

    // Delegate to StripeSync (Replit connector)
    try {
      const sync = await getStripeSync();
      await sync.processWebhook(payload, signature);
    } catch (err: any) {
      logger.debug({ err: err?.message }, "StripeSync processWebhook skipped");
    }
  }
}
