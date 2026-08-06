/**
 * Tags the RelateIQ+ Pro product with metadata { app: "relateiq" } so the
 * api-server can distinguish it from other products in the Stripe account.
 * Run with STRIPE_MODE=live for the live account, default for sandbox.
 */
import { getUncachableStripeClient } from "./lib/stripeClient.js";

async function main() {
  const stripe = await getUncachableStripeClient();
  const products = await stripe.products.list({ active: true, limit: 100 });
  const targets = products.data.filter((p) => p.name.startsWith("RelateIQ+"));
  if (targets.length === 0) {
    console.log("No RelateIQ+ product found");
    return;
  }
  for (const p of targets) {
    await stripe.products.update(p.id, { metadata: { ...p.metadata, app: "relateiq" } });
    console.log(`Tagged ${p.id} (${p.name}) with app=relateiq`);
  }
}
main().catch((e) => { console.error("ERR", e.message); process.exit(1); });
