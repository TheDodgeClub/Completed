import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  ticketUrl: text("ticket_url"),
  imageUrl: text("image_url"),
  attendeeCount: integer("attendee_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  attendeeCount: true,
  createdAt: true,
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type DbEvent = typeof eventsTable.$inferSelect;
