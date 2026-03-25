import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  try {
    // Verify Stripe credentials are reachable
    const { getUncachableStripeClient } = await import("./stripeClient");
    await getUncachableStripeClient();
    logger.info("Stripe client ready");
  } catch (err: any) {
    logger.warn({ err }, "Stripe credentials not available — ticket checkout will be unavailable");
  }
}

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
