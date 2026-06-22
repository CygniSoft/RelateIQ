const API_BASE = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api`;

export interface HeartbeatResult {
  revoked: boolean;
  activeCount: number;
  limit: number;
}

export async function sendHeartbeat(
  deviceLabel: string,
  token: string | undefined,
): Promise<HeartbeatResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/sessions/heartbeat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ deviceLabel }),
  });

  if (!res.ok) {
    throw new Error(`Heartbeat failed (HTTP ${res.status})`);
  }
  return (await res.json()) as HeartbeatResult;
}
