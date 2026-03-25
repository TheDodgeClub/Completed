import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { eventsTable } from "./events";

export const eventRegistrationsTable = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.eventId)]);

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrationsTable).omit({
  id: true,
  registeredAt: true,
});
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type EventRegistration = typeof eventRegistrationsTable.$inferSelect;
