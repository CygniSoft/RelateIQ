import {
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Durable delivery and idempotency state for calendar invitations. A Clerk user
// can have one delivery record for each calendar event UID.
export const meetingInvitesTable = pgTable(
  "meeting_invites",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    meetingUid: text("meeting_uid").notNull(),
    status: text("status").notNull().default("claimed"),
    // The token prevents an expired worker from changing the result of a newer
    // claimant that has reacquired the same invitation.
    claimToken: text("claim_token"),
    claimExpiresAt: timestamp("claim_expires_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("meeting_invites_user_uid_uniq").on(t.userId, t.meetingUid),
    index("meeting_invites_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const insertMeetingInviteSchema = createInsertSchema(
  meetingInvitesTable,
).omit({ id: true, createdAt: true, updatedAt: true, sentAt: true });
export type InsertMeetingInvite = z.infer<typeof insertMeetingInviteSchema>;
export type MeetingInvite = typeof meetingInvitesTable.$inferSelect;