# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

### Email sending (introduction emails)

Intro emails are sent server-side via **SMTP** (nodemailer), provider-agnostic. These are
operator-level secrets set **once in Replit Secrets / Deployment env — never in the app
UI** (a single shared sending account must not be exposed to end-user devices).

**Preferred — generic SMTP (works with any provider: Outlook, Yahoo, iCloud, SendGrid,
Mailgun, a work mailbox, etc.):**

- `SMTP_HOST` — SMTP server host, e.g. `smtp-mail.outlook.com`, `smtp.sendgrid.net`.
- `SMTP_USER` — SMTP username (often the full email address; for SendGrid it's `apikey`).
- `SMTP_PASS` — SMTP password / app password / API key.
- `SMTP_PORT` — optional, defaults to `587`.
- `SMTP_SECURE` — optional `"true"`/`"false"`; defaults to `true` only when port is `465`.
- `SMTP_FROM` — optional custom verified sender address; defaults to `SMTP_USER`.

**Fallback — Gmail (used only if the `SMTP_*` vars above are not set):**

- `GMAIL_USER` — the Gmail address to send from.
- `GMAIL_APP_PASSWORD` — a Gmail **App Password** (Google Account → Security →
  2-Step Verification → App passwords). Not your normal Gmail password.

Most consumer/SMTP providers deliver to **any** recipient with no domain/DNS step. The
authenticated account is the envelope sender (unless `SMTP_FROM` is a provider-verified
custom address); the sending user's name is shown as the display name, and `replyTo` is
the sending user's own email so replies route back to them. The send endpoint
(`POST /api/send-email`) is Clerk-authed. Mind each provider's daily send limits.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

ConnectIQ (RelateIQ+) is a premium dark-mode networking CRM (Expo). Core flow: scan a
business card → AI extracts contact details → AI drafts an intro email → save & send.
All contact data is local-first (device AsyncStorage).

### Subscription (Stripe)

Scanning business cards and AI intro-email generation require an active **Pro**
subscription ("RelateIQ+ Pro", monthly/annual). Viewing existing contacts/data stays
free. Billing is server-driven via Stripe + `stripe-replit-sync`:

- Server billing routes (Clerk-authed): `GET /api/billing/products`,
  `GET /api/billing/subscription`, `POST /api/billing/checkout`, `POST /api/billing/portal`.
- Stripe webhook is registered at `/api/stripe/webhook` with `express.raw` **before**
  `express.json()`; `initStripe()` runs migrations → sync → managed webhook → backfill.
- NEVER create stripe-schema tables; only read `stripe.products/prices/subscriptions`.
- Client: `lib/billingApi.ts`, `context/SubscriptionContext.tsx` (provides `isPro`),
  `components/Paywall.tsx` (Stripe Checkout via `WebBrowser.openAuthSessionAsync`, deep-link
  return). Gating lives in `app/(tabs)/scan.tsx`; subscription card + Manage Subscription
  (Stripe portal) in `app/(tabs)/profile.tsx`.
- Seed plans with `pnpm --filter @workspace/scripts run seed-stripe-products`.

### Concurrent-session enforcement

To detect account sharing, the client sends a heartbeat (`POST /api/sessions/heartbeat`,
keyed on the Clerk `sessionId`) on mount, every 45s, and on app foreground. The server
enforces `MAX_CONCURRENT_SESSIONS` (env, default 1) and revokes the **oldest** session;
when the heartbeat returns `revoked:true` the client calls Clerk `signOut()`. Wiring lives
in `context/SubscriptionContext.tsx` (client) and `routes/sessions.ts` + `lib/sessionStore.ts`
(server).

## User preferences

- Payments: use **Stripe** (chosen by the user).
- Account-sharing policy: sign the **oldest** session out when the concurrent-session
  limit is exceeded.

## Gotchas

- Stripe webhook route MUST be registered with `express.raw` before `express.json()`.
- `stripe-replit-sync` reads bundled SQL migrations from disk via `__dirname`; it must stay
  in esbuild's `external[]` or migrations are silently skipped (`relation "stripe.accounts"
  does not exist`).
- Stripe connection settings expose `secret`/`publishable` (NOT `secret_key`).
- Pre-existing typecheck errors in `hooks/useColors.ts` and `app/contact/[id].tsx` are
  unrelated to billing/session work — ignore them.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
