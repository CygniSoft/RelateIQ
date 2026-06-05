import { Router, type IRouter } from "express";
// Replit integration: Google Calendar + HubSpot via @replit/connectors-sdk proxy.
// The SDK injects OAuth tokens and refreshes them automatically.
import { ReplitConnectors } from "@replit/connectors-sdk";

const router: IRouter = Router();
const connectors = new ReplitConnectors();

const CONNECTED_OK = new Set(["healthy", "active", "connected", "ok"]);

function isHealthy(status?: string): boolean {
  if (status == null || status === "") return true;
  return CONNECTED_OK.has(status.toLowerCase());
}

async function isConnectorConnected(name: string): Promise<boolean> {
  try {
    const conns = await connectors.listConnections({
      connector_names: name,
      refresh_policy: "auto",
    });
    return conns.some(
      (c) => c.connector_name === name && isHealthy(c.status ?? undefined),
    );
  } catch {
    return false;
  }
}

interface SyncContact {
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  website?: string;
}

interface SyncFollowUp {
  contactId: string;
  name: string;
  action: string;
  date: string;
  notes?: string;
}

// Upper bound on a single sync batch to guard against oversized payloads.
const MAX_BATCH = 500;

function toCalendarDate(input: string): string | null {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function nextDay(yyyyMmDd: string): string {
  const d = new Date(`${yyyyMmDd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// GET /api/integrations/status
router.get("/integrations/status", async (req, res): Promise<void> => {
  try {
    const [googleCalendar, hubspot] = await Promise.all([
      isConnectorConnected("google-calendar"),
      isConnectorConnected("hubspot"),
    ]);
    const gmail =
      typeof process.env["GMAIL_USER"] === "string" &&
      process.env["GMAIL_USER"] !== "" &&
      typeof process.env["GMAIL_APP_PASSWORD"] === "string" &&
      process.env["GMAIL_APP_PASSWORD"] !== "";

    res.json({ gmail, googleCalendar, hubspot });
  } catch (err) {
    req.log.error({ err }, "Failed to read integration status");
    res.status(500).json({ error: "Failed to read integration status" });
  }
});

// POST /api/integrations/hubspot/sync  { contacts: SyncContact[] }
router.post("/integrations/hubspot/sync", async (req, res): Promise<void> => {
  const contacts: unknown = req.body?.contacts;
  if (!Array.isArray(contacts) || contacts.length === 0) {
    res.status(400).json({ error: "No contacts to sync" });
    return;
  }
  if (contacts.length > MAX_BATCH) {
    res.status(400).json({ error: `Too many contacts (max ${MAX_BATCH} per sync)` });
    return;
  }

  const inputs = (contacts as SyncContact[])
    .filter((c) => typeof c.email === "string" && c.email.trim() !== "")
    .map((c) => ({
      idProperty: "email",
      id: (c.email ?? "").trim(),
      properties: {
        email: (c.email ?? "").trim(),
        firstname: c.firstName ?? "",
        lastname: c.lastName ?? "",
        company: c.company ?? "",
        jobtitle: c.jobTitle ?? "",
        phone: c.phone ?? "",
        website: c.website ?? "",
      },
    }));

  const skipped = contacts.length - inputs.length;

  if (inputs.length === 0) {
    res.json({ synced: 0, skipped, message: "No contacts had an email address." });
    return;
  }

  try {
    const response = await connectors.proxy(
      "hubspot",
      "/crm/v3/objects/contacts/batch/upsert",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      req.log.error(
        { status: response.status, detail },
        "HubSpot upsert failed",
      );
      res.status(502).json({ error: "HubSpot rejected the sync. Is it connected?" });
      return;
    }

    const data = (await response.json()) as { results?: unknown[] };
    const synced = Array.isArray(data.results) ? data.results.length : inputs.length;
    req.log.info({ synced, skipped }, "Synced contacts to HubSpot");
    res.json({ synced, skipped });
  } catch (err) {
    req.log.error({ err }, "Failed to sync contacts to HubSpot");
    res.status(500).json({ error: "Failed to sync to HubSpot" });
  }
});

// POST /api/integrations/calendar/sync  { followUps: SyncFollowUp[] }
router.post("/integrations/calendar/sync", async (req, res): Promise<void> => {
  const followUps: unknown = req.body?.followUps;
  if (!Array.isArray(followUps) || followUps.length === 0) {
    res.status(400).json({ error: "No follow-ups to sync" });
    return;
  }
  if (followUps.length > MAX_BATCH) {
    res.status(400).json({ error: `Too many follow-ups (max ${MAX_BATCH} per sync)` });
    return;
  }

  const valid = (followUps as SyncFollowUp[])
    .map((f) => ({ ...f, calDate: toCalendarDate(f.date) }))
    .filter((f): f is SyncFollowUp & { calDate: string } => f.calDate !== null);

  if (valid.length === 0) {
    res.json({ synced: 0, skipped: followUps.length });
    return;
  }

  try {
    // Find already-synced follow-ups to keep this idempotent.
    const existing = await connectors.proxy(
      "google-calendar",
      "/calendar/v3/calendars/primary/events?privateExtendedProperty=connectiqApp%3D1&maxResults=2500&singleEvents=true",
      { method: "GET" },
    );

    const alreadySynced = new Set<string>();
    if (existing.ok) {
      const data = (await existing.json()) as {
        items?: Array<{
          extendedProperties?: { private?: Record<string, string> };
        }>;
      };
      for (const item of data.items ?? []) {
        const id = item.extendedProperties?.private?.["connectiqContactId"];
        if (id) alreadySynced.add(id);
      }
    }

    let synced = 0;
    let failed = 0;
    for (const f of valid) {
      if (alreadySynced.has(f.contactId)) continue;

      const body = {
        summary: `Follow up: ${f.name}`,
        description:
          `Action: ${f.action}` + (f.notes ? `\n\nNotes: ${f.notes}` : ""),
        start: { date: f.calDate },
        end: { date: nextDay(f.calDate) },
        reminders: { useDefault: true },
        extendedProperties: {
          private: { connectiqApp: "1", connectiqContactId: f.contactId },
        },
      };

      const created = await connectors.proxy(
        "google-calendar",
        "/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (created.ok) {
        synced += 1;
      } else {
        failed += 1;
        const detail = await created.text().catch(() => "");
        req.log.error(
          { status: created.status, detail },
          "Calendar event create failed",
        );
      }
    }

    const skipped = followUps.length - synced - failed;
    req.log.info({ synced, skipped, failed }, "Synced follow-ups to Calendar");
    res.json({ synced, skipped, failed });
  } catch (err) {
    req.log.error({ err }, "Failed to sync follow-ups to Calendar");
    res.status(500).json({ error: "Failed to sync to Google Calendar" });
  }
});

export default router;
