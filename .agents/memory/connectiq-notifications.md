---
name: ConnectIQ real notifications (expo-notifications)
description: Durable design rules for the ConnectIQ local notification scheduler
---

Real device notifications live in `lib/notifications.ts`, driven by `notificationPrefs`
persisted in AppContext (local-first). Non-obvious constraints:

- **Native only.** `expo-notifications` scheduling is a no-op on web; everything is
  guarded on `Platform.OS !== "web"`. Prefs still persist on web, but nothing fires. The
  Replit preview runs on web, so notifications only verify on a real device / dev build.
  **How to apply:** don't try to "test" firing in the web preview — it will never fire.

- **Sync strategy = cancel-all-then-reschedule.** `syncScheduledNotifications` cancels ALL
  scheduled notifications then rebuilds from prefs+contacts. This is only safe because it's
  **serialized + coalesced** via a single module-level promise chain (`syncChain` +
  `pendingArgs`, latest-wins) with a `.catch(()=>{})` guard.
  **Why:** two overlapping runs interleave their cancel/schedule and leave stale or
  duplicate schedules. **How to apply:** never call the raw reschedule concurrently; keep
  the single-flight wrapper.

- **Anything scheduled to a fixed future instant is fine under cancel-all** because it
  reschedules to the SAME absolute time each run (idempotent). Anything scheduled relative
  to `Date.now()` drifts forward on every sync and never fires — onboarding tips must be
  anchored to a persisted baseline (`@connectiq/onboardingAnchor`), not `now`.
  **Why:** the sync effect fires on every contacts/prefs change.

- Meeting reminders derive from `contact.timeline` (type `"meeting"`), NOT the `events`
  list — so `events` is intentionally absent from the sync effect deps. Current UI books
  meetings at `date: now`, so meeting reminders only fire once meetings gain future dates.
