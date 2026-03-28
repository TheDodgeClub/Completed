import app from "./app";
import { logger } from "./lib/logger";
import { runStreakNotificationJob } from "./services/streakNotifications";
import { pool } from "@workspace/db";

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

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_prt_email ON password_reset_tokens(email);
    `);
    logger.info("DB migrations applied");
  } finally {
    client.release();
  }
}

await runMigrations();
await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

// Hourly streak notification job: fires once on startup (in case server was
// down during a window) then every 60 minutes thereafter.
async function startStreakNotificationCron() {
  const run = () =>
    runStreakNotificationJob().catch((err: unknown) =>
      logger.error({ err }, "streak notification cron error"),
    );

  // Delay initial run by 30s to let DB connections settle after startup
  setTimeout(() => {
    run();
    setInterval(run, 60 * 60 * 1000);
  }, 30_000);

  logger.info("streak notification cron scheduled (hourly)");
}

startStreakNotificationCron();
