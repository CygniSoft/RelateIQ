---
name: Replit connectors-sdk proxy paths
description: How @replit/connectors-sdk .proxy() forwards paths for google-calendar and hubspot
---

# @replit/connectors-sdk proxy base URLs

`new ReplitConnectors().proxy(connectorName, path, {method, body, headers})` forwards
`path` onto the provider's **API root host**, NOT a versioned API base. You must include
the full versioned path yourself.

- **google-calendar**: proxy host is `https://www.googleapis.com` (root). The Calendar API
  lives under `/calendar/v3`, so paths must be e.g.
  `/calendar/v3/calendars/primary/events`. Using `/calendars/primary/events` returns a
  Google **404 HTML page** ("requested URL ... not found on this server") — easy to mistake
  for an auth problem; it's a path problem.
- **hubspot**: paths like `/crm/v3/objects/contacts/batch/upsert` work directly.

**Why:** debugging the calendar sync, the proxy reached Google (got Google's branded 404)
but the path was wrong because the SDK doesn't prepend `/calendar/v3`.

**How to apply:** for any new googleapis connector call, prepend the service's versioned
segment (`/calendar/v3`, `/gmail/v1`, etc.). When a proxy call returns a provider 404 HTML
page, suspect a missing version prefix before suspecting connection/auth.

## Status detection
`listConnections({connector_names, refresh_policy:'auto'})` returns `Connection[]`; check
`c.connector_name === name` and treat empty/unknown `c.status` as healthy (only explicit
unhealthy states should fail). A dismissed/never-connected connector yields 0 entries, and
proxy calls to it return a provider 404 like
`{"error":{"message":"No hubspot connection found for this customer"}}`.
