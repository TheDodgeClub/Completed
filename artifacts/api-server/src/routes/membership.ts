import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import { logger } from "../lib/logger";
import { activateElite } from "../services/activateElite";

const ELITE_PRICE_ID =
  process.env.STRIPE_ELITE_PRICE_ID ?? "price_1TGg5bRqEaJwGxMgheuqrmBc";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

/* GET /api/membership/status */
router.get("/status", requireAuth, async (req: any, res) => {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, req.session.userId),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let nextBillingDate: string | null = null;
  if (user.isElite && user.stripeSubscriptionId) {
    try {
      const stripe = await getUncachableStripeClient();
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      if ((sub as any).current_period_end) {
        nextBillingDate = new Date((sub as any).current_period_end * 1000).toISOString();
      }
    } catch (err) {
      logger.debug({ err }, "membership/status: could not fetch subscription details");
    }
  }

  res.json({
    isElite: user.isElite ?? false,
    eliteSince: user.eliteSince?.toISOString() ?? null,
    nextBillingDate,
    stripeSubscriptionId: user.stripeSubscriptionId ?? null,
  });
});

/* POST /api/membership/checkout — create a Stripe Checkout Session for Elite */
router.post("/checkout", requireAuth, async (req: any, res) => {
  const userId: number = req.session.userId;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.isElite) {
    res.status(400).json({ error: "Already an Elite member" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: String(userId) },
      });
      customerId = customer.id;
      await db
        .update(usersTable)
        .set({ stripeCustomerId: customerId })
        .where(eq(usersTable.id, userId));
    }

    const origin =
      (req.headers.origin as string | undefined) ??
      "https://the-dodge-club.replit.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: ELITE_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/?membership=success`,
      cancel_url: `${origin}/?membership=cancelled`,
      metadata: { userId: String(userId) },
      subscription_data: { metadata: { userId: String(userId) } },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    logger.error({ err }, "membership/checkout error");
    res.status(500).json({ error: err.message ?? "Stripe error" });
  }
});

/* POST /api/membership/subscription-intent — in-app Elite subscription via Payment Element */
router.post("/subscription-intent", requireAuth, async (req: any, res) => {
  const userId: number = req.session.userId;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.isElite) { res.status(400).json({ error: "Already an Elite member" }); return; }

  try {
    const stripe = await getUncachableStripeClient();
    const publishableKey = await getStripePublishableKey();

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

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: ELITE_PRICE_ID }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { userId: String(userId) },
    });

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as any;

    if (!paymentIntent?.client_secret) {
      logger.error({ subscriptionId: subscription.id, invoiceId: invoice?.id }, "subscription-intent: payment_intent missing from invoice");
      res.status(500).json({ error: "Could not create payment intent" });
      return;
    }

    res.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey,
      subscriptionId: subscription.id,
    });
  } catch (err: any) {
    const msg = err?.message ?? "Stripe error";
    logger.error({ err }, "membership/subscription-intent error");
    res.status(500).json({ error: msg });
  }
});

/* POST /api/membership/confirm-subscription — activate Elite after Payment Element confirms */
router.post("/confirm-subscription", requireAuth, async (req: any, res) => {
  const userId: number = req.session.userId;
  const { subscriptionId } = req.body as { subscriptionId?: string };
  if (!subscriptionId) { res.status(400).json({ error: "subscriptionId required" }); return; }

  try {
    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice.payment_intent"],
    });

    const invoice = subscription.latest_invoice as any;
    const pi = invoice?.payment_intent as any;
    const isReady = subscription.status === "active" || pi?.status === "succeeded";

    if (!isReady) {
      res.status(400).json({ error: `Subscription not ready (status: ${subscription.status})` });
      return;
    }

    await db.update(usersTable).set({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
    }).where(eq(usersTable.id, userId));

    await activateElite(userId);
    res.json({ isElite: true });
  } catch (err: any) {
    logger.error({ err }, "membership/confirm-subscription error");
    res.status(500).json({ error: err.message ?? "Stripe error" });
  }
});

/* POST /api/membership/portal — Stripe Customer Portal to manage/cancel */
router.post("/portal", requireAuth, async (req: any, res) => {
  const userId: number = req.session.userId;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  if (!user?.stripeCustomerId) {
    res.status(400).json({ error: "No billing account found" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const origin =
      (req.headers.origin as string | undefined) ??
      "https://the-dodge-club.replit.app";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/`,
    });

    res.json({ url: portalSession.url });
  } catch (err: any) {
    logger.error({ err }, "membership/portal error");
    res.status(500).json({ error: err.message ?? "Stripe error" });
  }
});

export default router;
