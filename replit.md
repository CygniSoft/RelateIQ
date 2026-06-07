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

Intro emails are sent server-side via **Resend**. These are operator-level secrets set
**once in Replit Secrets / Deployment env — never in the app UI** (a single shared key
must not be exposed to end-user devices):

- `RESEND_API_KEY` — Resend API key (get one at resend.com → API Keys).
- `EMAIL_FROM` — verified sender, e.g. `RelateIQ+ <intros@yourdomain.com>`. Defaults to
  `RelateIQ+ <onboarding@resend.dev>`, which only delivers to the Resend account owner.

To send to any recipient, verify your domain in Resend (paste the DNS records into your
domain provider), then set `EMAIL_FROM` to an address on that domain. The send endpoint
(`POST /api/send-email`) is Clerk-authed; the sender's name is shown and `replyTo` is the
sending user's own email so replies route back to them.

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
