import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const PLAYER_ROLES = ["Thrower", "Catcher", "Dodger", "All-Rounder"] as const;
export type PlayerRole = typeof PLAYER_ROLES[number];

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  avatarUrl: text("avatar_url"),
  username: text("username").unique(),
  preferredRole: text("preferred_role"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  pushToken: text("push_token"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  lastSeenAt: timestamp("last_seen_at"),
  isElite: boolean("is_elite").notNull().default(false),
  stripeSubscriptionId: text("stripe_subscription_id"),
  eliteSince: timestamp("elite_since"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
