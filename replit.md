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

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
