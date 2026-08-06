import Stripe from "stripe";
import { StripeSync, runMigrations } from "stripe-replit-sync";

interface StripeCredentials {
  secretKey: string;
  webhookSecret?: string;
}

/**
 * Fetches Stripe credentials from the Replit connection API.
 * Not cached -- tokens can rotate, so fetch fresh each time.
 */
async function getStripeCredentials(): Promise<StripeCredentials> {
  const hostname = process.env["REPLIT_CONNECTORS_HOSTNAME"];
  const xReplitToken = process.env["REPL_IDENTITY"]
    ? "repl " + process.env["REPL_IDENTITY"]
    : process.env["WEB_REPL_RENEWAL"]
      ? "depl " + process.env["WEB_REPL_RENEWAL"]
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Missing Replit environment variables. " +
        "Ensure the Stripe integration is connected via the Integrations tab.",
    );
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText}`,
    );
  }

  const data = (await resp.json()) as {
    items?: {
      settings?: {
        secret?: string;
        secret_key?: string;
        webhook_secret?: string;
      };
    }[];
  };

  // The Stripe connection can expose multiple accounts (sandbox + live).
  // Use the live account in deployments (real payments), sandbox in the
  // development workspace.
  const isDeployment =
    !process.env["REPL_IDENTITY"] && !!process.env["WEB_REPL_RENEWAL"];
  const candidates = (data.items ?? [])
    .map((i) => i.settings)
    .filter((s): s is NonNullable<typeof s> => !!(s?.secret ?? s?.secret_key));
  const isLive = (s: { secret?: string; secret_key?: string }) =>
    (s.secret ?? s.secret_key ?? "").startsWith("sk_live");
  // Fail closed: if multiple accounts exist but none matches the required
  // mode, do not silently fall back (a deployment must never use a test key).
  const settings =
    candidates.find((s) => isLive(s) === isDeployment) ??
    (candidates.length === 1 ? candidates[0] : undefined);
  if (candidates.length > 1 && !settings) {
    throw new Error(
      `Stripe connection has no ${isDeployment ? "live" : "test"}-mode account for this environment.`,
    );
  }
  const secretKey = settings?.secret ?? settings?.secret_key;

  if (!secretKey) {
    throw new Error(
      "Stripe integration not connected or missing secret key. " +
        "Connect Stripe via the Integrations tab first.",
    );
  }

  return {
    secretKey,
    ...(settings?.webhook_secret ? { webhookSecret: settings.webhook_secret } : {}),
  };
}

/**
 * Returns a fresh authenticated Stripe client.
 * Not cached -- fetches credentials on every call so rotated keys are picked up.
 */
export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

// Cache the Stripe account id per secret key so hot paths (product /
// subscription queries) don't call the Stripe API every time.
const accountIdCache = new Map<string, string>();

/**
 * Returns the Stripe account id ("acct_...") for the currently selected
 * credentials. Synced `stripe.*` rows are tagged with `_account_id`, so
 * queries filter on this to ignore rows synced from other/older accounts.
 */
export async function getStripeAccountId(): Promise<string> {
  const { secretKey } = await getStripeCredentials();
  const cached = accountIdCache.get(secretKey);
  if (cached) return cached;
  const stripe = new Stripe(secretKey);
  // Parameterless form retrieves the account that owns the API key; the SDK
  // types only describe the by-id overload, so cast the call signature.
  const account = await (
    stripe.accounts.retrieve.bind(stripe.accounts) as unknown as () => Promise<Stripe.Account>
  )();
  accountIdCache.set(secretKey, account.id);
  return account.id;
}

/**
 * Returns a fresh StripeSync instance for webhook processing and data sync.
 * Not cached -- fetches credentials on every call so rotated keys are picked up.
 */
export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const { secretKey, webhookSecret } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: webhookSecret ?? "",
  });
}

// Single-flight guard so concurrent requests don't trigger parallel backfills,
// plus a cooldown so a genuinely empty Stripe catalog doesn't re-trigger a
// backfill on every request.
let backfillInFlight: Promise<void> | null = null;
let lastBackfillAt = 0;
const BACKFILL_COOLDOWN_MS = 5 * 60_000;

/**
 * Runs Stripe schema migrations + a data backfill (products, prices,
 * subscriptions, ...) into the local `stripe` schema. Concurrent callers share
 * one in-flight backfill; completed attempts (success or failure) are subject
 * to a cooldown. Used to self-heal when the startup backfill did not complete
 * (e.g. in a fresh production deployment).
 *
 * Returns true if a backfill ran (or was joined), false if skipped by cooldown.
 */
export async function ensureStripeBackfill(): Promise<boolean> {
  if (backfillInFlight) {
    await backfillInFlight;
    return true;
  }
  if (Date.now() - lastBackfillAt < BACKFILL_COOLDOWN_MS) {
    return false;
  }
  backfillInFlight = (async () => {
    const databaseUrl = process.env["DATABASE_URL"];
    if (databaseUrl) {
      // Also covers the case where startup init failed before migrations ran.
      await runMigrations({ databaseUrl });
    }
    const stripeSync = await getStripeSync();
    await stripeSync.syncBackfill();
  })().finally(() => {
    lastBackfillAt = Date.now();
    backfillInFlight = null;
  });
  await backfillInFlight;
  return true;
}
