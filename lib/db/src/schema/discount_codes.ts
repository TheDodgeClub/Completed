import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const discountCodesTable = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(),
  discountAmount: integer("discount_amount").notNull(),
  maxUses: integer("max_uses"),
  usesCount: integer("uses_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DiscountCode = typeof discountCodesTable.$inferSelect;
