import { runMigrations } from "stripe-replit-sync";
import app from "./app";
import { ensureClerkMobileRedirectUrl } from "./lib/clerkRedirectUrl";
import { logger } from "./lib/logger";
import { getStripeSync } from "./lib/stripeClient";

/**
 * Create the `stripe` schema, register the managed webhook, and backfill all
 * existing Stripe data on startup. Failures here are logged but do not prevent
 * the server from starting (the rest of the API stays available).
 */
async function initStripe(): Promise<void> {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set; skipping Stripe initialization");
    return;
  }

  try {
    await runMigrations({ databaseUrl });
    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env["REPLIT_DOMAINS"]?.split(",")[0]}`;
    const webhook = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
    );
    logger.info({ webhook: webhook?.url ?? "configured" }, "Stripe webhook ready");

    stripeSync
      .syncBackfill()
      .then(() => logger.info("Stripe data synced"))
      .catch((err) => logger.error({ err }, "Stripe syncBackfill failed"));
  } catch (err) {
    logger.error({ err }, "Failed to initialize Stripe");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await Promise.all([initStripe(), ensureClerkMobileRedirectUrl()]);

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
