---
name: Stripe prod backfill self-heal
description: Why billing routes trigger their own Stripe backfill instead of trusting startup init
---
Rule: never rely solely on the startup `initStripe()` backfill to populate the `stripe.*` schema in a deployment; billing reads must self-heal when the catalog is empty or the query throws.

**Why:** In production the startup backfill silently never completed (webhook worked, "StripeSync initialized" logged, but no "data synced"/failure log), leaving `stripe.products/prices` empty → TestFlight paywall showed "Plans are unavailable right now."

**How to apply:** `loadProductsWithRecovery()` in `routes/billing.ts` + `ensureStripeBackfill()` in `lib/stripeClient.ts` (runs migrations then syncBackfill; single-flight; 5-min cooldown). Verify prod fix by querying `stripe.products` via the database skill with environment "production".
