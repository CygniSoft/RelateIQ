import { db, deviceSessionsTable } from "@workspace/db";
import type { DeviceSession } from "@workspace/db";
import { and, asc, eq, gte, inArray } from "drizzle-orm";

// A session is considered "live" if it has sent a heartbeat within this window.
// Closed apps stop heartbeating and free their slot after the window elapses,
// so a user is never permanently locked out by a stale session.
const LIVE_WINDOW_MS = 2 * 60 * 1000;

/** Max concurrent live sessions allowed per user (default 1). */
export function getMaxConcurrentSessions(): number {
  const n = Number(process.env["MAX_CONCURRENT_SESSIONS"]);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export interface HeartbeatResult {
  revoked: boolean;
  reason?: string;
  activeCount: number;
  limit: number;
}

/**
 * Record a heartbeat for the current device session and enforce the concurrent
 * session limit. When the number of live sessions exceeds the limit, the
 * oldest sessions are revoked; a revoked session learns it was signed out on
 * its next heartbeat and signs itself out client-side.
 */
export async function recordHeartbeat(
  userId: string,
  sessionId: string,
  deviceLabel: string | null,
): Promise<HeartbeatResult> {
  const limit = getMaxConcurrentSessions();
  const now = new Date();

  const [existing] = await db
    .select()
    .from(deviceSessionsTable)
    .where(
      and(
        eq(deviceSessionsTable.userId, userId),
        eq(deviceSessionsTable.sessionId, sessionId),
      ),
    );

  if (existing?.revoked) {
    return {
      revoked: true,
      reason: "signed_out_elsewhere",
      activeCount: 0,
      limit,
    };
  }

  await db
    .insert(deviceSessionsTable)
    .values({ userId, sessionId, deviceLabel })
    .onConflictDoUpdate({
      target: [deviceSessionsTable.userId, deviceSessionsTable.sessionId],
      set: {
        lastSeenAt: now,
        ...(deviceLabel ? { deviceLabel } : {}),
      },
    });

  const liveCutoff = new Date(now.getTime() - LIVE_WINDOW_MS);
  const live = await db
    .select()
    .from(deviceSessionsTable)
    .where(
      and(
        eq(deviceSessionsTable.userId, userId),
        eq(deviceSessionsTable.revoked, false),
        gte(deviceSessionsTable.lastSeenAt, liveCutoff),
      ),
    )
    .orderBy(asc(deviceSessionsTable.createdAt));

  let revokedIds = new Set<number>();
  if (live.length > limit) {
    const toRevoke = live
      .slice(0, live.length - limit)
      .map((r: DeviceSession) => r.id);
    if (toRevoke.length > 0) {
      await db
        .update(deviceSessionsTable)
        .set({ revoked: true })
        .where(inArray(deviceSessionsTable.id, toRevoke));
      revokedIds = new Set(toRevoke);
    }
  }

  const current = live.find((r: DeviceSession) => r.sessionId === sessionId);
  const currentRevoked = current ? revokedIds.has(current.id) : false;

  return {
    revoked: currentRevoked,
    activeCount: live.length - revokedIds.size,
    limit,
  };
}

export interface ActiveSessionInfo {
  sessionId: string;
  deviceLabel: string | null;
  lastSeenAt: Date;
  createdAt: Date;
  current: boolean;
}

/** List the user's currently live (non-revoked, recently seen) sessions. */
export async function listActiveSessions(
  userId: string,
  currentSessionId: string | null,
): Promise<ActiveSessionInfo[]> {
  const liveCutoff = new Date(Date.now() - LIVE_WINDOW_MS);
  const rows = await db
    .select()
    .from(deviceSessionsTable)
    .where(
      and(
        eq(deviceSessionsTable.userId, userId),
        eq(deviceSessionsTable.revoked, false),
        gte(deviceSessionsTable.lastSeenAt, liveCutoff),
      ),
    )
    .orderBy(asc(deviceSessionsTable.createdAt));

  return rows.map((r: DeviceSession) => ({
    sessionId: r.sessionId,
    deviceLabel: r.deviceLabel,
    lastSeenAt: r.lastSeenAt,
    createdAt: r.createdAt,
    current: r.sessionId === currentSessionId,
  }));
}
