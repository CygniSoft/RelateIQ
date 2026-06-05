---
name: expo-contacts addContactAsync requires name
description: Gotcha when saving a contact to the device address book with expo-contacts
---

# expo-contacts: `name` is required on addContactAsync

`Contacts.addContactAsync(contact)` throws (surfaced in ConnectIQ as "Couldn't save
contact") if the contact object lacks a top-level `name` string. Setting only
`firstName` / `lastName` is NOT enough — the native API needs the display `name`.

**Why:** the TS type `Contacts.Contact` marks `name` as required, and the native
module rejects the contact at runtime without it. Easy to miss because the object
otherwise looks complete.

**How to apply:** always set `name: `${firstName} ${lastName}`.trim()` (with a
fallback like company) when building a contact to save. Saving is native-only —
guard `Platform.OS === "web"` and surface `err.message` in the catch so failures
are diagnosable.
