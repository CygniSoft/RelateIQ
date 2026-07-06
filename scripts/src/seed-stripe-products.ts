import { getUncachableStripeClient } from "./lib/stripeClient";

const PRODUCT_NAME = "RelateIQ+ Pro";
const CURRENCY = "cad";

const PLANS: Array<{
  interval: "month" | "year";
  unit_amount: number;
  label: string;
}> = [
  { interval: "month", unit_amount: 999, label: "$9.99/month" },
  { interval: "year", unit_amount: 9900, label: "$99.00/year" },
];

async function main(): Promise<void> {
  const stripe = await getUncachableStripeClient();

  console.log(`Seeding Stripe products and prices (currency: ${CURRENCY.toUpperCase()})...`);

  // Find or create the product.
  const existing = await stripe.products.search({
    query: `name:'${PRODUCT_NAME}' AND active:'true'`,
  });

  let productId: string;
  if (existing.data.length > 0) {
    productId = existing.data[0]!.id;
    console.log(`Product "${PRODUCT_NAME}" already exists (${productId}).`);
  } else {
    const product = await stripe.products.create({
      name: PRODUCT_NAME,
      description:
        "Unlock unlimited business-card scanning and AI-assisted introduction emails in RelateIQ+.",
    });
    productId = product.id;
    console.log(`Created product: ${product.name} (${productId})`);
  }

  // Archive any active prices that are not in the target currency. A Stripe
  // price's currency is immutable, so switching currency means creating new
  // prices and deactivating the old ones.
  const activePrices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });
  for (const price of activePrices.data) {
    if (price.currency !== CURRENCY) {
      await stripe.prices.update(price.id, { active: false });
      console.log(
        `Archived non-${CURRENCY.toUpperCase()} price ${price.id} (${price.currency}/${price.recurring?.interval}).`,
      );
    }
  }

  // Ensure one active price per interval in the target currency.
  const remaining = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });
  for (const plan of PLANS) {
    const match = remaining.data.find(
      (p) =>
        p.currency === CURRENCY &&
        p.recurring?.interval === plan.interval &&
        p.unit_amount === plan.unit_amount,
    );
    if (match) {
      console.log(
        `Price already exists: ${plan.label} ${CURRENCY.toUpperCase()} (${match.id}).`,
      );
      continue;
    }
    const created = await stripe.prices.create({
      product: productId,
      unit_amount: plan.unit_amount,
      currency: CURRENCY,
      recurring: { interval: plan.interval },
    });
    console.log(
      `Created ${plan.interval} price: ${plan.label} ${CURRENCY.toUpperCase()} (${created.id}).`,
    );
  }

  console.log("Done. The webhook + backfill will sync these into the stripe schema.");
}

main().catch((err: unknown) => {
  console.error("Failed to seed Stripe products:", err);
  process.exit(1);
});
