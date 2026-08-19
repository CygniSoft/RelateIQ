---
name: ConnectIQ Apple login compliance
description: Durable App Store login requirement and release verification rule for ConnectIQ.
---

RelateIQ+ must offer Sign in with Apple anywhere it offers Google sign-in.

**Why:** Apple rejected version 1.0 (build 10) under App Store Review Guideline 4.8 because Google was available without an equivalent privacy-preserving login option.

**How to apply:** Keep Apple visible on sign-in and sign-up, enable Apple for the Production authentication environment, and test Apple private-relay and repeat-login behavior in the exact TestFlight build submitted for review.

The Replit/Expo browser preview uses the Development authentication environment. Enabling Apple only in Production is correct for TestFlight but does not activate the preview button; enable it separately in Development only when preview testing is needed.