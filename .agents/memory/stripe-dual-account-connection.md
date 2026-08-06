---
name: Stripe dual-account Replit connection
description: The Replit Stripe connector returns TWO settings items (sandbox + live); mode selection and livemode filtering rules.
---

The Replit Stripe connection (reconnected 2026-08-06) exposes **two** items from
`connectors /api/v2/connection?connector_names=stripe`: a sandbox account
(`sk_test_`, "Premium Connect Sandbox") and the live account (`sk_live_`,
Cygnisoft Staffing Inc., `acct_1IhjN9BRgkS3iIyY`, charges/payouts enabled, CAD).

**Rule:** never take `items[0]` blindly. Select by mode: deployments (no
`REPL_IDENTITY`, `WEB_REPL_RENEWAL` set) use live; workspace dev uses sandbox.
Fail closed when a dual-account response lacks the required mode — a deployment
must never silently use a test key. Seeding scripts select live only via
`STRIPE_MODE=live`.

**Why:** the paywall was silently serving test-mode plans in TestFlight; the
user's "switch to live" attempts in the Stripe dashboard change nothing — mode
selection is entirely in our credential-picking code.

**How to apply:** all reads of the synced `stripe.*` schema (products, prices,
subscriptions) must filter on `livemode` matching the environment, or stale
opposite-mode rows resurface (wrong prices, false entitlement). Stored
`users.stripeCustomerId` can belong to the other mode — verify with
`customers.retrieve` before checkout/portal and re-create when missing.

Live plans for "RelateIQ+ Pro" already exist on the live account:
CAD 9.99/month and CAD 99/year (no re-seeding needed).
