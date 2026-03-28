import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { eventsTable } from "./events";

export const streakNotificationsTable = pgTable(
  "streak_notifications",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
  },
  (t) => ({
    uniq: unique().on(t.eventId, t.userId),
  }),
);

export type StreakNotification = typeof streakNotificationsTable.$inferSelect;
