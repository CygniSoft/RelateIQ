export type MeetingInviteClaimDisposition =
  | "sent"
  | "unknown"
  | "busy"
  | "reclaim";

/**
 * Classifies persisted invitation state without making a delivery decision.
 * `pending` is the legacy pre-state-machine value and deliberately fails
 * closed as an unknown in-progress SMTP handoff.
 */
export function classifyMeetingInviteState(
  status: string,
  claimExpiresAt: Date | null,
  now: Date,
): MeetingInviteClaimDisposition {
  if (status === "sent") return "sent";
  if (status === "sending" || status === "pending") return "unknown";
  if (status === "failed") return "reclaim";
  if (status === "claimed") {
    return claimExpiresAt !== null && claimExpiresAt > now ? "busy" : "reclaim";
  }
  return "unknown";
}