---
name: Meeting delivery idempotency
description: Why meeting invitation and device-calendar retries use different fail-closed recovery strategies.
---

Invitation delivery with ordinary SMTP cannot guarantee exactly-once behavior: a process can lose its connection after the mail server accepted the message but before local state records success. A pending/uncertain invitation claim must therefore remain non-retryable; only an explicitly failed send may be reclaimed.

**Why:** Automatically expiring an in-progress invitation claim can send a duplicate after slow SMTP delivery, process termination, or a post-acceptance persistence failure. Returning success after known SMTP acceptance also prevents the client from retrying solely because the final state write failed.

**How to apply:** Key invitation claims by authenticated user plus stable meeting UID, bind the organizer to the user's verified server-side identity, and treat sent or uncertain/pending claims as deduplicated/busy. For device calendar events, recover by the stable meeting UID embedded in the native event before creating a replacement.