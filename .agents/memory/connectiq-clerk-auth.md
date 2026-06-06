---
name: ConnectIQ Clerk auth (Expo)
description: How real auth is wired in the connectiq Expo app via Replit-managed Clerk — env flow, flash-free gating, proxy.
---

# ConnectIQ Clerk auth (Expo + Replit-managed Clerk)

Real auth (email/password + Google OAuth) gates the app behind an `(auth)` route group.

## Flash-free route gating — use `Stack.Protected`, not a useEffect redirect
The root `app/_layout.tsx` wraps the tree in `<ClerkLoaded>`, so by the time the
navigator mounts `useAuth().isLoaded` is already true. Gate routes with
`<Stack.Protected guard={...}>` (expo-router 6) around the `(auth)` vs `(tabs)` screens.
**Why:** an effect-based `router.replace` redirect renders the protected screen for one
frame before redirecting (visible flash). `Stack.Protected` removes the unavailable
screens so expo-router renders the correct anchor immediately with no flash.
**How to apply:** because the guard auto-redirects when the Clerk session changes, make
`signIn.finalize` / `signUp.finalize` / `setActive` `navigate` callbacks no-ops (just
handle `session.currentTask`) — do NOT manually `router.replace("/(tabs)")`, which can
fire before the guard re-renders and target a not-yet-available route.

## Env var flow (the non-obvious part)
Clerk keys reach the bundle as `EXPO_PUBLIC_*` and are wired in TWO places:
- dev: `package.json` `dev` script prepends `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY`.
- prod build: `scripts/build.js` `startMetro` env adds `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
  and computes `EXPO_PUBLIC_CLERK_PROXY_URL` = `https://<domain><CLERK_PROXY_URL>`.
**Why:** Expo only inlines `EXPO_PUBLIC_`-prefixed vars; the raw `CLERK_*` secrets are not
visible to the client. Forgetting the build.js side means prod has no key/proxy.

## Frontend API proxy
The api-server mounts the Clerk Frontend API proxy at a fixed path and runs
`clerkMiddleware` with `publishableKeyFromHost(...)`. The proxy is production-only; in dev
the Expo app talks to Clerk directly. See `clerkProxyMiddleware.ts` (copied from the
clerk-auth skill template) — mount it BEFORE body parsers (it streams raw bytes).

## Custom-UI API gotchas (Clerk Core v3)
- Sign-up requires `<View nativeID="clerk-captcha" />` on the form (bot protection is on by default).
- Field errors live on `errors.fields.<field>.message`; `errors.raw[]` is typed opaque (`{}`) — don't index `.message` off it (TS error).
- Sign-in extra statuses: handle `needs_client_trust` via `signIn.mfa.sendEmailCode()` →
  `signIn.mfa.verifyEmailCode({code})` → `finalize`.
