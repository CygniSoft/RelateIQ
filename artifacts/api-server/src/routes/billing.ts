import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import {
  getUncachableStripeClient,
  ensureStripeBackfill,
} from "../lib/stripeClient";
import {
  getUser,
  upsertUser,
  setStripeCustomerId,
  getSubscriptionForUser,
  listProductsWithPrices,
} from "../lib/stripeStorage";

const router: IRouter = Router();

function publicBaseUrl(): string {
  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0];
  return domain ? `https://${domain}` : "";
}

// Allowlist of acceptable post-checkout return targets to avoid open redirects.
function isAllowedReturnUrl(url: string): boolean {
  if (url.startsWith("connectiq://") || url.startsWith("exp://")) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const host = parsed.hostname;
    return (
      host.endsWith(".replit.dev") ||
      host.endsWith(".replit.app") ||
      host === "localhost"
    );
  } catch {
    return false;
  }
}

async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const u = await clerkClient.users.getUser(userId);
    return (
      u.primaryEmailAddress?.emailAddress ??
      u.emailAddresses[0]?.emailAddress ??
      null
    );
  } catch {
    return null;
  }
}

/** Only returns an email the user has actually verified with Clerk. */
async function getVerifiedUserEmail(userId: string): Promise<string | null> {
  try {
    const u = await clerkClient.users.getUser(userId);
    const verified = u.emailAddresses.find(
      (e) => e.verification?.status === "verified",
    );
    const primary = u.primaryEmailAddress;
    if (primary && primary.verification?.status === "verified") {
      return primary.emailAddress;
    }
    return verified?.emailAddress ?? null;
  } catch {
    return null;
  }
}

// Simple in-memory per-IP rate limiter for the public checkout endpoint.
const webCheckoutHits = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = webCheckoutHits.get(ip);
  if (!entry || now > entry.resetAt) {
    webCheckoutHits.set(ip, { count: 1, resetAt: now + windowMs });
    if (webCheckoutHits.size > 10_000) {
      for (const [k, v] of webCheckoutHits) {
        if (now > v.resetAt) webCheckoutHits.delete(k);
      }
    }
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

/**
 * Loads products; if the synced stripe schema is empty (or the query fails,
 * e.g. tables missing because startup init never completed), self-heals by
 * running migrations + a Stripe backfill, then re-queries once. Backfill
 * attempts are single-flight and cooldown-limited in ensureStripeBackfill.
 */
async function loadProductsWithRecovery(
  log: { warn: (msg: string) => void },
): Promise<Awaited<ReturnType<typeof listProductsWithPrices>>> {
  let products: Awaited<ReturnType<typeof listProductsWithPrices>> | null = null;
  try {
    products = await listProductsWithPrices();
  } catch {
    log.warn("Billing products query failed; attempting Stripe self-heal");
  }
  if (products && products.length > 0) return products;
  if (products) {
    log.warn("No billing products found; triggering Stripe backfill");
  }
  const ran = await ensureStripeBackfill();
  if (!ran && products) return products;
  return listProductsWithPrices();
}

// List active products + prices (the plans shown on the paywall).
router.get("/billing/products", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const products = await loadProductsWithRecovery(req.log);
    res.json({ products });
  } catch (err) {
    req.log.error({ err }, "Failed to list billing products");
    res.status(500).json({ error: "Failed to load plans" });
  }
});

// Current subscription status for the signed-in user.
router.get("/billing/subscription", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    let user = await getUser(userId);
    // If the user has no linked Stripe customer yet, they may have subscribed
    // on the marketing website before installing the app. Adopt an existing
    // Stripe customer only when (a) the email is verified with Clerk and
    // (b) that customer actually holds an active subscription in this account.
    if (!user?.stripeCustomerId) {
      const email = await getVerifiedUserEmail(userId);
      if (email) {
        const stripe = await getUncachableStripeClient();
        const found = await stripe.customers.list({ email, limit: 10 });
        for (const customer of found.data) {
          const candidate = await getSubscriptionForUser(customer.id);
          if (candidate.active) {
            if (!user) user = await upsertUser(userId, email);
            await setStripeCustomerId(userId, customer.id);
            user = { ...user, stripeCustomerId: customer.id };
            req.log.info(
              { userId, customerId: customer.id },
              "Adopted web-purchase Stripe customer by verified email",
            );
            break;
          }
        }
      }
    }
    const summary = await getSubscriptionForUser(user?.stripeCustomerId ?? null);
    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Failed to load subscription status");
    res.status(500).json({ error: "Failed to load subscription" });
  }
});

// Start a Stripe Checkout session for a subscription price.
router.post("/billing/checkout", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const priceId = (req.body as { priceId?: unknown })?.priceId;
  const returnUrl = (req.body as { returnUrl?: unknown })?.returnUrl;
  if (typeof priceId !== "string" || priceId === "") {
    res.status(400).json({ error: "Missing 'priceId'" });
    return;
  }
  if (typeof returnUrl !== "string" || !isAllowedReturnUrl(returnUrl)) {
    res.status(400).json({ error: "Invalid 'returnUrl'" });
    return;
  }

  try {
    const email = await getUserEmail(userId);
    let user = await getUser(userId);
    if (!user) user = await upsertUser(userId, email);

    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId;
    if (customerId) {
      // A stored customer id may belong to a different Stripe account/mode
      // (e.g. created against the sandbox before going live). Verify it and
      // re-create if it doesn't exist in the current account.
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ((existing as { deleted?: boolean }).deleted) customerId = null;
      } catch {
        customerId = null;
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        ...(email ? { email } : {}),
        metadata: { userId },
      });
      customerId = customer.id;
      await setStripeCustomerId(userId, customerId);
    }

    const base = publicBaseUrl();
    const encoded = encodeURIComponent(returnUrl);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/api/billing/return?status=success&to=${encoded}`,
      cancel_url: `${base}/api/billing/return?status=cancel&to=${encoded}`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      res.status(502).json({ error: "Stripe did not return a checkout URL" });
      return;
    }
    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Failed to create checkout session");
    res.status(500).json({ error: "Failed to start checkout" });
  }
});

// Public checkout for the marketing website. No auth: Stripe collects the
// buyer's email at checkout, and the app links the subscription to their
// account by email on first sign-in (see /billing/subscription fallback).
router.post("/billing/web-checkout", async (req, res): Promise<void> => {
  if (isRateLimited(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Too many requests. Please try again shortly." });
    return;
  }
  const interval = (req.body as { interval?: unknown })?.interval;
  if (interval !== "month" && interval !== "year") {
    res.status(400).json({ error: "Invalid 'interval' (expected 'month' or 'year')" });
    return;
  }

  try {
    const products = await loadProductsWithRecovery(req.log);
    const price = products
      .flatMap((p) => p.prices)
      .find((pr) => pr.interval === interval);
    if (!price) {
      res.status(404).json({ error: "Plan not available" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const base = publicBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${base}/website/?checkout=success`,
      cancel_url: `${base}/website/?checkout=cancel`,
    });

    if (!session.url) {
      res.status(502).json({ error: "Stripe did not return a checkout URL" });
      return;
    }
    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Failed to create web checkout session");
    res.status(500).json({ error: "Failed to start checkout" });
  }
});

// Open the Stripe customer portal so users can manage/cancel their plan.
router.post("/billing/portal", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const returnUrl = (req.body as { returnUrl?: unknown })?.returnUrl;
  if (typeof returnUrl !== "string" || !isAllowedReturnUrl(returnUrl)) {
    res.status(400).json({ error: "Invalid 'returnUrl'" });
    return;
  }

  try {
    const user = await getUser(userId);
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "No billing account yet" });
      return;
    }
    const stripe = await getUncachableStripeClient();
    // Reject customer ids that don't exist in the current Stripe account/mode
    // (e.g. sandbox-era ids after switching the app to the live account).
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId);
      if ((existing as { deleted?: boolean }).deleted) {
        res.status(400).json({ error: "No billing account yet" });
        return;
      }
    } catch {
      res.status(400).json({ error: "No billing account yet" });
      return;
    }
    const base = publicBaseUrl();
    const encoded = encodeURIComponent(returnUrl);
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${base}/api/billing/return?status=portal&to=${encoded}`,
    });
    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Failed to create portal session");
    res.status(500).json({ error: "Failed to open billing portal" });
  }
});

// Public redirect target Stripe sends the browser back to. It bounces the
// browser to the app's deep link so the in-app browser session resolves.
router.get("/billing/return", (req, res): void => {
  const status = String(req.query["status"] ?? "");
  const to = String(req.query["to"] ?? "");

  if (to && isAllowedReturnUrl(to)) {
    const sep = to.includes("?") ? "&" : "?";
    res.redirect(`${to}${sep}checkout=${encodeURIComponent(status)}`);
    return;
  }

  res
    .status(200)
    .type("html")
    .send(
      `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>RelateIQ+</title></head><body style="font-family:-apple-system,system-ui,sans-serif;background:#080A12;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center"><div><h2>${status === "success" ? "You're all set 🎉" : "Done"}</h2><p>You can return to the RelateIQ+ app now.</p></div></body></html>`,
    );
});

export default router;
