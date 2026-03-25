import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const awardsTable = pgTable("awards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  note: text("note"),
  awardedAt: timestamp("awarded_at").notNull().defaultNow(),
});

export const insertAwardSchema = createInsertSchema(awardsTable).omit({
  id: true,
  awardedAt: true,
});
export type InsertAward = z.infer<typeof insertAwardSchema>;
export type Award = typeof awardsTable.$inferSelect;
