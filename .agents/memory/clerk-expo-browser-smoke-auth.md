---
name: Clerk Expo browser smoke authentication
description: Reliable automated sign-in for @clerk/expo browser previews when Clerk's normal browser session injection does not reach the Expo provider.
---

Standard Clerk browser-session injection may leave an `@clerk/expo` web preview signed out even though the testing helper created cookies successfully. For UI-only smoke tests, use a temporary backend-created Clerk user whose email contains `+clerk_test`, complete first-device verification with Clerk's documented test code, and delete the user immediately after the run.

**Why:** Cookie-based injection, ordinary test sign-up, and a temporary ordinary-email user all failed in the Expo-domain preview: the Expo provider ignored the injected session, sign-up hit Cloudflare human verification, and the ordinary user required an inaccessible real verification code. A backend-created `+clerk_test` user completed the real app sign-in UI reliably.

**How to apply:** Use this only for automated development smoke tests of the Expo browser preview. Never log generated credentials, always clean up the temporary user in a `finally` path, and keep production authentication unchanged.