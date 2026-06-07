---
name: ConnectIQ intro-email sending
description: How introduction emails are sent (provider, sender identity, auth, domain constraint)
---

# Intro-email sending

Introduction emails are sent via **Gmail SMTP** (nodemailer) from the api-server,
from a single shared operator Gmail account — NOT from each user's own mailbox.

- **Sender identity:** `from` = the sending user's name as display name + the
  `GMAIL_USER` address (Gmail forces the authenticated account as the envelope sender;
  you cannot spoof a different from-address). `replyTo` = the sending user's own email,
  so replies reach the real person.
- **Secrets:** `GMAIL_USER` + `GMAIL_APP_PASSWORD` (a Google App Password, requires
  2-Step Verification enabled — not the normal account password).
- **Why Gmail over Resend:** the user explicitly chose convenience over branding.
  Resend's shared `onboarding@resend.dev` only delivers to the Resend account owner; to
  email arbitrary recipients Resend requires verifying a domain via DNS. Gmail SMTP
  delivers to **anyone with zero DNS/verification setup** — the tradeoff is the from
  address is the Gmail account, not a branded `@relateiq.app` domain. Switched away from
  Resend on this basis (the `resend` npm dep was removed, `nodemailer` re-added).
- **Why app-level sending at all:** chosen over per-user OAuth mailbox sending because
  it works for ALL users (incl. email/password signups) and is simple. The Replit
  `google-calendar` connector is app-level (one account), so connectors cannot send
  "as each end user" in a multi-user app.

## Limits / constraints
- Gmail daily send caps: ~500/day free, ~2000/day Workspace. Fine for a small app,
  not for bulk.
- To switch back to a branded app-domain sender later, you'd re-add an ESP (Resend etc.)
  and do the domain DNS verification — the step the user is currently avoiding.

## Security
- `POST /api/send-email` is **Clerk-authed**: handler calls `getAuth(req)` and 401s
  without a `userId`. The Expo client must send `Authorization: Bearer <getToken()>`
  (wired in `contact/[id].tsx` → `lib/emailApi.ts`). Without the guard it was an open
  mail relay (ESP abuse/cost risk).
- **There are TWO client send call-sites** for `sendEmail` (`lib/emailApi.ts`): the
  contact detail screen (`contact/[id].tsx`) AND the scan-save flow
  (`(tabs)/scan.tsx`, fire-and-forget after saving a contact). Both must fetch
  `useAuth().getToken()` and pass `token`. **Why:** when auth was first added only the
  contact screen was updated; sends from the scan flow silently 401'd (no
  `Authorization` header reached the server) — the user's actual path was scan-save.
  `emailApi.sendEmail` only attaches the header when a truthy `token` is passed, so a
  missing token fails silently with 401. Audit all call-sites when changing auth.
- Inputs are hardened against header injection: `to`/`replyTo` validated as emails,
  `subject` rejects CR/LF/control chars, `buildFrom` strips CR/LF and quote/angle chars.
