import { randomUUID } from "node:crypto";
import { db, meetingInvitesTable } from "@workspace/db";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { classifyMeetingInviteState } from "./meetingInviteState";

const CLAIM_LEASE_MS = 5 * 60 * 1000;
const INVITE_WINDOW_MS = 15 * 60 * 1000;
const INVITE_LIMIT = 10;

export type MeetingInviteClaim =
  | { outcome: "claimed"; claimToken: string }
  | { outcome: "sent" }
  | { outcome: "unknown" }
  | { outcome: "busy" }
  | { outcome: "rate_limited" };

/**
 * Claims an invitation for delivery. The advisory transaction lock serializes
 * claims for one Clerk user, making both the unique UID decision and the
 * durable distinct-event rate limit safe across API processes.
 */
export async function claimMeetingInvite(
  userId: string,
  meetingUid: string,
): Promise<MeetingInviteClaim> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${userId}))`,
    );

    const [existing] = await tx
      .select()
      .from(meetingInvitesTable)
      .where(
        and(
          eq(meetingInvitesTable.userId, userId),
          eq(meetingInvitesTable.meetingUid, meetingUid),
        ),
      );
    if (existing) {
      const now = new Date();
      const disposition = classifyMeetingInviteState(
        existing.status,
        existing.claimExpiresAt,
        now,
      );
      if (disposition === "sent") return { outcome: "sent" };
      if (disposition === "unknown") return { outcome: "unknown" };
      if (disposition === "busy") return { outcome: "busy" };
      // Failed delivery and a claimant whose lease expired before handing off
      // to SMTP can safely be retried.
      const claimToken = randomUUID();
      const claimExpiresAt = new Date(now.getTime() + CLAIM_LEASE_MS);
      await tx
        .update(meetingInvitesTable)
        .set({ status: "claimed", claimToken, claimExpiresAt, updatedAt: now })
        .where(eq(meetingInvitesTable.id, existing.id));
      return { outcome: "claimed", claimToken };
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - INVITE_WINDOW_MS);
    const [{ value }] = await tx
      .select({ value: count() })
      .from(meetingInvitesTable)
      .where(
        and(
          eq(meetingInvitesTable.userId, userId),
          gte(meetingInvitesTable.createdAt, cutoff),
        ),
      );
    if (value >= INVITE_LIMIT) return { outcome: "rate_limited" };

    const claimToken = randomUUID();
    const claimExpiresAt = new Date(now.getTime() + CLAIM_LEASE_MS);
    await tx.insert(meetingInvitesTable).values({
      userId,
      meetingUid,
      status: "claimed",
      claimToken,
      claimExpiresAt,
    });
    return { outcome: "claimed", claimToken };
  });
}

/** Atomically records that the claimant is about to hand this UID to SMTP. */
export async function markMeetingInviteSending(
  userId: string,
  meetingUid: string,
  claimToken: string,
): Promise<boolean> {
  const updated = await db
    .update(meetingInvitesTable)
    .set({ status: "sending" })
    .where(
      and(
        eq(meetingInvitesTable.userId, userId),
        eq(meetingInvitesTable.meetingUid, meetingUid),
        eq(meetingInvitesTable.status, "claimed"),
        eq(meetingInvitesTable.claimToken, claimToken),
      ),
    )
    .returning({ id: meetingInvitesTable.id });
  return updated.length === 1;
}

export async function markMeetingInviteSent(
  userId: string,
  meetingUid: string,
  claimToken: string,
): Promise<boolean> {
  const updated = await db
    .update(meetingInvitesTable)
    .set({
      status: "sent",
      sentAt: new Date(),
      claimToken: null,
      claimExpiresAt: null,
    })
    .where(
      and(
        eq(meetingInvitesTable.userId, userId),
        eq(meetingInvitesTable.meetingUid, meetingUid),
        eq(meetingInvitesTable.status, "sending"),
        eq(meetingInvitesTable.claimToken, claimToken),
      ),
    )
    .returning({ id: meetingInvitesTable.id });
  return updated.length === 1;
}

export async function markMeetingInviteFailed(
  userId: string,
  meetingUid: string,
  claimToken: string,
): Promise<void> {
  await db
    .update(meetingInvitesTable)
    .set({
      status: "failed",
      claimToken: null,
      claimExpiresAt: null,
    })
    .where(
      and(
        eq(meetingInvitesTable.userId, userId),
        eq(meetingInvitesTable.meetingUid, meetingUid),
        eq(meetingInvitesTable.status, "sending"),
        eq(meetingInvitesTable.claimToken, claimToken),
      ),
    );
}

/** Releases a claim that could not be handed to SMTP during preflight. */
export async function releaseMeetingInviteClaim(
  userId: string,
  meetingUid: string,
  claimToken: string,
): Promise<void> {
  await db
    .update(meetingInvitesTable)
    .set({ status: "failed", claimToken: null, claimExpiresAt: null })
    .where(
      and(
        eq(meetingInvitesTable.userId, userId),
        eq(meetingInvitesTable.meetingUid, meetingUid),
        eq(meetingInvitesTable.status, "claimed"),
        eq(meetingInvitesTable.claimToken, claimToken),
      ),
    );
}