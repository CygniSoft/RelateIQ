import {
  pgTable,
  text,
  serial,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Tracks active device sessions per user so we can detect account sharing and
// enforce a concurrent-session limit. One row per (Clerk userId, Clerk
// sessionId). A row is marked `revoked` when a newer device pushes it out; the
// revoked device discovers this on its next heartbeat and signs itself out.
export const deviceSessionsTable = pgTable(
  "device_sessions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    sessionId: text("session_id").notNull(),
    deviceLabel: text("device_label"),
    revoked: boolean("revoked").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("device_sessions_user_session_uniq").on(t.userId, t.sessionId),
  ],
);

export const insertDeviceSessionSchema = createInsertSchema(
  deviceSessionsTable,
).omit({ id: true, createdAt: true, lastSeenAt: true });
export type InsertDeviceSession = z.infer<typeof insertDeviceSessionSchema>;
export type DeviceSession = typeof deviceSessionsTable.$inferSelect;
