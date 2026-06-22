import { getUncachableStripeClient } from "./lib/stripeClient";

const PRODUCT_NAME = "RelateIQ+ Pro";

async function main(): Promise<void> {
  const stripe = await getUncachableStripeClient();

  console.log("Seeding Stripe products and prices...");

  const existing = await stripe.products.search({
    query: `name:'${PRODUCT_NAME}' AND active:'true'`,
  });

  if (existing.data.length > 0) {
    const product = existing.data[0]!;
    console.log(`Product "${PRODUCT_NAME}" already exists (${product.id}). Skipping.`);
    const prices = await stripe.prices.list({ product: product.id, active: true });
    for (const price of prices.data) {
      console.log(
        `  - price ${price.id}: ${(price.unit_amount ?? 0) / 100} ${price.currency}/${price.recurring?.interval}`,
      );
    }
    return;
  }

  const product = await stripe.products.create({
    name: PRODUCT_NAME,
    description:
      "Unlock unlimited business-card scanning and AI-assisted introduction emails in RelateIQ+.",
  });
  console.log(`Created product: ${product.name} (${product.id})`);

  const monthly = await stripe.prices.create({
    product: product.id,
    unit_amount: 999,
    currency: "usd",
    recurring: { interval: "month" },
  });
  console.log(`Created monthly price: $9.99/month (${monthly.id})`);

  const annual = await stripe.prices.create({
    product: product.id,
    unit_amount: 9900,
    currency: "usd",
    recurring: { interval: "year" },
  });
  console.log(`Created annual price: $99.00/year (${annual.id})`);

  console.log("Done. The webhook + backfill will sync these into the stripe schema.");
}

main().catch((err: unknown) => {
  console.error("Failed to seed Stripe products:", err);
  process.exit(1);
});
