---
name: Stripe prod backfill self-heal
description: Why billing routes trigger their own Stripe backfill instead of trusting startup init
---
Rule: never rely solely on the startup `initStripe()` backfill to populate the `stripe.*` schema in a deployment; billing reads must self-heal when the catalog is empty or the query throws.

**Why:** In production the startup backfill silently never completed (webhook worked, "StripeSync initialized" logged, but no "data synced"/failure log), leaving `stripe.products/prices` empty → TestFlight paywall showed "Plans are unavailable right now."

**How to apply:** `loadProductsWithRecovery()` in `routes/billing.ts` + `ensureStripeBackfill()` in `lib/stripeClient.ts` (runs migrations then syncBackfill; single-flight; 5-min cooldown). Verify prod fix by querying `stripe.products` via the database skill with environment "production".

## Update (Aug 6 2026)
- On the real live account (years of business data) the full stripe-replit-sync backfill NEVER completes in the deployment — stripe.prices stayed empty despite repeated self-heal triggers. Don't rely on the synced schema for the paywall.
- Fix: paywall/checkout read plans directly from the Stripe API (paginated prices.list, 60s cache) when the local copy has no usable plans; backfill now runs in background only.
- The live account holds unrelated Cygnisoft products: RelateIQ+ products are tagged metadata app=relateiq (both accounts, via scripts/src/tag-relateiq-product.ts); all plan reads filter on that tag/name prefix, and /billing/checkout validates caller-supplied priceId against the RelateIQ+ catalog (broken-price-authorization risk otherwise).
- Entitlement after purchase relies on webhook-driven sync writing stripe.subscriptions (works without backfill if webhook registration succeeded).
