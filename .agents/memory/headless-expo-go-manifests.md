---
name: Headless Expo Go manifests
description: Why EAS-linked Expo Go workflows can stall before a physical device receives its manifest.
---

For headless Replit Expo workflows without CLI-level Expo authentication, run the development server in Expo offline mode so manifest requests do not wait on the interactive development-certificate login prompt.

**Why:** Expo Go requests an `expo-root` signature for EAS-linked projects. The Expo CLI otherwise pauses for “Log in” versus “Proceed anonymously”; in a managed workflow nobody can answer it, so physical devices spin after scanning an otherwise valid QR code. Using the offline path fixed both iPhone and Android launches.

**How to apply:** Keep the EAS project ID for production builds. Apply offline mode only to the local/device-testing workflow when no Expo CLI token is intentionally configured, then verify that the workflow logs show an unsigned-manifest warning rather than an authentication prompt.