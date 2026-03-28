import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const postReportsTable = pgTable("post_reports", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  reportedByUserId: integer("reported_by_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reason: text("reason"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PostReport = typeof postReportsTable.$inferSelect;
