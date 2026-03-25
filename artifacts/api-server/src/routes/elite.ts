import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const ELITE_PRICE_GBP = 899; // £8.99 in pence
const ELITE_MONTHLY_LABEL = "Elite Membership — The Dodge Club";

/* GET /api/elite/status — current user's elite subscription state */
router.get("/status", requireAuth, async (req: any, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({
    isElite: user.isElite,
    eliteSince: user.eliteSince?.toISOString() ?? null,
    stripeSubscriptionId: user.stripeSubscriptionId ?? null,
  });
});

/* POST /api/elite/subscribe — create Stripe subscription Checkout Session */
router.post("/subscribe", requireAuth, async (req: any, res) => {
  const userId = req.session.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (user.isElite) {
    res.status(409).json({ error: "Already an Elite member" });
    return;
  }

  const stripe = await getUncachableStripeClient();

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId;
  if (customerId) {
    try {
      const c = await stripe.customers.retrieve(customerId);
      if ((c as any).deleted) customerId = null;
    } catch (err: any) {
      if (err?.code === "resource_missing") customerId = null;
      else throw err;
    }
  }
  if (!customerId) {
    const isValidEmail = (e: string | null) => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    const customer = await stripe.customers.create({
      ...(isValidEmail(user.email) ? { email: user.email } : {}),
      ...(user.name ? { name: user.name } : {}),
      metadata: { userId: String(userId) },
    });
    customerId = customer.id;
    await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, userId));
  }

  const baseUrl = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : `${req.protocol}://${req.get("host")}`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "gbp",
        product_data: {
          name: ELITE_MONTHLY_LABEL,
          description: "Early tickets · Exclusive tips · Members-only content · Discounted tickets",
        },
        unit_amount: ELITE_PRICE_GBP,
        recurring: { interval: "month" },
      },
      quantity: 1,
    }],
    mode: "subscription",
    success_url: `${baseUrl}/api/elite/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/mobile/?eliteCancelled=1`,
    metadata: { userId: String(userId) },
  });

  res.json({ url: session.url });
});

/* GET /api/elite/success — verify checkout session and grant elite status */
router.get("/success", async (req: any, res) => {
  const { session_id } = req.query as { session_id?: string };
  if (!session_id) { res.status(400).send("Missing session_id"); return; }

  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ["subscription"] });

    if (session.status === "complete" && session.mode === "subscription") {
      const userId = Number(session.metadata?.userId);
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : (session.subscription as any)?.id;

      if (userId) {
        await db.update(usersTable)
          .set({ isElite: true, stripeSubscriptionId: subscriptionId, eliteSince: new Date() })
          .where(eq(usersTable.id, userId));
      }
    }
  } catch (err) {
    console.error("[elite] success handler error:", err);
  }

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost";
  res.redirect(`https://${domain}/mobile/?eliteSuccess=1`);
});

/* GET /api/elite/manage — Stripe customer portal for subscription management */
router.get("/manage", requireAuth, async (req: any, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user?.stripeCustomerId) {
    res.status(400).json({ error: "No Stripe customer found" });
    return;
  }
  const stripe = await getUncachableStripeClient();
  const baseUrl = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : `${req.protocol}://${req.get("host")}`;
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/mobile/`,
  });
  res.json({ url: portal.url });
});

/* POST /api/elite/webhook — handle subscription lifecycle events */
router.post("/webhook-sub", async (req, res) => {
  const event = req.body;
  try {
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      await db.update(usersTable)
        .set({ isElite: false, stripeSubscriptionId: null })
        .where(eq(usersTable.stripeSubscriptionId, sub.id));
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const isActive = sub.status === "active" || sub.status === "trialing";
      await db.update(usersTable)
        .set({ isElite: isActive })
        .where(eq(usersTable.stripeSubscriptionId, sub.id));
    }
    res.json({ received: true });
  } catch (err) {
    console.error("[elite] webhook error:", err);
    res.status(500).json({ error: "Webhook handling failed" });
  }
});

export default router;
