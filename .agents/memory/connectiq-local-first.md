---
name: ConnectIQ local-first data & analytics
description: Why ConnectIQ analytics/insights must be computed on-device, plus the pre-existing typecheck errors that are NOT yours to fix.
---

# ConnectIQ is local-first

All user data (contacts, events, profile) lives in **AsyncStorage on the device**
via `context/AppContext.tsx` — there is no server-side store of personal data.
The api-server is a stateless bridge for OpenAI scanning, Gmail send, and Google
Calendar sync only.

**Rule:** Any analytics, ROI, or "AI insight" feature must be computed
**on-device** from the in-memory `events`/`contacts` arrays (see
`lib/eventIntelligence.ts`). Do NOT add a server analytics endpoint that expects
the server to know the user's contacts/events — it doesn't have them.

**Why:** privacy model + offline-first. Insights branded "AI" in the UI are
deterministic local computations derived from the user's own data, not LLM calls.

# Pre-existing typecheck noise (ignore when verifying your work)

`pnpm --filter @workspace/connectiq run typecheck` reports two pre-existing
errors unrelated to feature work:
- `hooks/useColors.ts` — `radius` incompatible with index signature (TS2352).
- `app/contact/[id].tsx` — several "possibly undefined" errors.

**How to apply:** when typechecking new ConnectIQ work, grep these out
(`grep -vE "useColors\.ts|contact/\[id\]"`) to confirm your changes are clean.
Note the useColors error spans multiple lines, so filter on `error TS` lines.
