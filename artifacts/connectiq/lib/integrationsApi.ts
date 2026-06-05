const API_BASE = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api`;

export interface IntegrationStatus {
  gmail: boolean;
  googleCalendar: boolean;
  hubspot: boolean;
}

export interface SyncContact {
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  website?: string;
}

export interface SyncFollowUp {
  contactId: string;
  name: string;
  action: string;
  date: string;
  notes?: string;
}

export interface SyncResult {
  success: boolean;
  synced?: number;
  skipped?: number;
  failed?: number;
  error?: string;
}

export async function getIntegrationStatus(): Promise<IntegrationStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/integrations/status`);
    if (!res.ok) return null;
    return (await res.json()) as IntegrationStatus;
  } catch {
    return null;
  }
}

async function postSync(path: string, payload: unknown): Promise<SyncResult> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        success: false,
        error: (data["error"] as string) ?? `HTTP ${res.status}`,
      };
    }
    return {
      success: true,
      synced: (data["synced"] as number) ?? 0,
      skipped: (data["skipped"] as number) ?? 0,
      failed: (data["failed"] as number) ?? 0,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export function syncContactsToHubSpot(contacts: SyncContact[]): Promise<SyncResult> {
  return postSync("/integrations/hubspot/sync", { contacts });
}

export function syncFollowUpsToCalendar(
  followUps: SyncFollowUp[],
): Promise<SyncResult> {
  return postSync("/integrations/calendar/sync", { followUps });
}
