import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { getUncachableStripeClient } from "../lib/stripeClient";
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

// List active products + prices (the plans shown on the paywall).
router.get("/billing/products", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const products = await listProductsWithPrices();
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
    const user = await getUser(userId);
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
