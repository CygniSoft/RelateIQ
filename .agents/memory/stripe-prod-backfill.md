---
name: Stripe prod backfill self-heal
description: Durable rules for serving a complete RelateIQ+ billing catalog when Stripe database sync is partial.
---

Treat the synced Stripe schema as a cache, not the authoritative source for the paywall. A catalog is complete only when the same RelateIQ+ product has every expected billing interval; otherwise read active recurring prices directly from Stripe.

**Why:** Full backfills can stall on a large live Stripe account or stop after syncing only part of a product. Treating “any price exists” as complete hid the annual plan from TestFlight even though the live catalog contained it.

**How to apply:** Paginate direct Stripe reads, filter to the RelateIQ+ product identity because the account contains unrelated products, cache briefly, and use the same recovered catalog to authorize checkout price IDs. Backfill may continue in the background.
