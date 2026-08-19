---
name: ConnectIQ device calendar ownership
description: Product rules for exporting follow-up reminders to calendars configured on each user’s phone.
---

Follow-up calendar export is a manual, device-local action. Events are written to a writable calendar already configured on the user’s phone, never to a project-wide connected Google account.

**Why:** Calendar data must stay private to each user, and exported events become user-owned calendar entries rather than records managed centrally by RelateIQ+.

**How to apply:** Keep duplicate/update metadata on-device. Clearing app data or deleting a contact may clear that metadata but must not automatically delete an already-exported calendar event unless the product policy is explicitly changed.