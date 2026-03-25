import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const teamHistoryTable = pgTable("team_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  teamName: text("team_name").notNull(),
  season: text("season").notNull(),
  roleInTeam: text("role_in_team"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTeamHistorySchema = createInsertSchema(teamHistoryTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTeamHistory = z.infer<typeof insertTeamHistorySchema>;
export type TeamHistory = typeof teamHistoryTable.$inferSelect;
