---
name: ConnectIQ intro-email sending
description: How introduction emails are sent (provider, sender identity, auth, domain constraint)
---

# Intro-email sending

Introduction emails are sent via **Resend** (transactional ESP) from the api-server,
NOT from each user's own mailbox.

- **Sender identity:** `from` = the sending user's name as display name + a verified
  app-domain address from env `EMAIL_FROM` (e.g. `RelateIQ+ <intros@relateiq.app>`).
  `replyTo` = the sending user's own email, so replies reach the real person.
- **Why this design:** chosen over per-user OAuth mailbox sending because it works for
  ALL users (incl. email/password signups), is scalable, and looks professional. The
  Replit `google-calendar` connector is app-level (one account via `listConnections`),
  so connectors cannot send "as each end user" in a multi-user app.
- **No ESP integration exists** in Replit (no Resend/SendGrid/Postmark/Mailgun). The
  key is a plain secret: `RESEND_API_KEY`. The from address is the env `EMAIL_FROM`.

## Domain constraint (important)
- Default `EMAIL_FROM` is `RelateIQ+ <onboarding@resend.dev>` (Resend's shared sender).
  In Resend test mode this **only delivers to the account owner's own email**. To send
  intros to arbitrary contacts, the user must verify their own domain in Resend (DNS)
  and set `EMAIL_FROM` to an address on that domain.

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
