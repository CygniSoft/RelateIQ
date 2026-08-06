import Stripe from "stripe";

interface StripeCredentials {
  secretKey: string;
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
    items?: { settings?: { secret?: string; secret_key?: string } }[];
  };

  // The Stripe connection can expose multiple accounts (sandbox + live).
  // Set STRIPE_MODE=live to seed the live account; defaults to sandbox/test.
  const candidates = (data.items ?? [])
    .map((i) => i.settings)
    .filter((s): s is NonNullable<typeof s> => !!(s?.secret ?? s?.secret_key));
  const wantLive = process.env["STRIPE_MODE"] === "live";
  const isLive = (s: { secret?: string; secret_key?: string }) =>
    (s.secret ?? s.secret_key ?? "").startsWith("sk_live");
  const settings =
    candidates.find((s) => isLive(s) === wantLive) ??
    (candidates.length === 1 ? candidates[0] : undefined);
  if (candidates.length > 1 && !settings) {
    throw new Error(
      `Stripe connection has no ${wantLive ? "live" : "test"}-mode account.`,
    );
  }
  const secretKey = settings?.secret ?? settings?.secret_key;

  if (!secretKey) {
    throw new Error(
      "Stripe integration not connected or missing secret key. " +
        "Connect Stripe via the Integrations tab first.",
    );
  }

  return { secretKey };
}

/**
 * Returns a fresh authenticated Stripe client.
 */
export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}
