import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  sentCount: integer("sent_count").notNull().default(0),
  sentBy: text("sent_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Announcement = typeof announcementsTable.$inferSelect;
