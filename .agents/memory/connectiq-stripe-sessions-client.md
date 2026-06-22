---
name: ConnectIQ Stripe subscription + concurrent-session client wiring
description: How the Expo client gates Pro features, runs the session heartbeat, and drives Stripe Checkout/portal — plus the non-obvious decisions behind it.
---

## Single provider owns both subscription state and the session heartbeat

`context/SubscriptionContext.tsx` is the one place that holds `isPro` AND drives the
concurrent-session heartbeat. They were combined deliberately: both need the Clerk
`getToken()` + foreground/interval lifecycle, so one provider avoids two competing timers
and two AppState listeners.

**Why:** keeping subscription polling and heartbeat in separate providers duplicated the
auth-token plumbing and AppState wiring. One context is simpler and the heartbeat already
needs to react to sign-in state.

**How to apply:** consume `useSubscription()` for `isPro`, `subscription`, `refresh`.
Mount `SubscriptionProvider` inside ClerkLoaded + AppProvider in `app/_layout.tsx`.

## Revoke → signOut uses a one-shot ref guard

The heartbeat calls Clerk `signOut()` exactly once when `revoked:true` (guarded by a
`revokedRef`), and network errors in the heartbeat are swallowed (never sign out on a
transient failure). Heartbeat keyed on Clerk `sessionId` server-side; `deviceLabel` is
cosmetic only (`Platform.OS`), so do NOT add `expo-device` just for it.

## Gating must cover the whole scan flow, not just entry points

Gating premium features (scan/AI-email) only at idle entry actions is bypassable: a
subscription can lapse mid-flow. `app/(tabs)/scan.tsx` therefore checks `requirePro()` at
every premium transition (scan, library pick, manual entry, generate-email, save-contact)
AND has a `useEffect` that ejects the user to idle + shows the paywall whenever `isPro`
flips false during a non-idle/non-done step.

**Why:** code review flagged entry-only gating as the one blocking gap.
**How to apply:** any new premium step in the scan flow needs its own `requirePro()` check;
don't rely solely on the entry gate. Note: `/api/scan-card` is currently unauthenticated, so
enforcement is client-side only — if hard server enforcement is ever required, add Clerk auth
+ a subscription entitlement check to that endpoint.

## Checkout/portal return via deep link

Paywall and profile use `WebBrowser.openAuthSessionAsync(url, ExpoLinking.createURL("/profile"))`
for Stripe Checkout/portal, then `await refresh()` after return (with a ~1.5s delay after
checkout to let the Stripe webhook land). On web, fall back to `window.location.href`.
In `profile.tsx`, alias expo-linking as `ExpoLinking` — react-native already imports `Linking`
(used for mailto), and a duplicate `Linking` binding is a hard Metro/Babel build error, not a
typecheck-only one.
