import { pgTable, serial, text, timestamp, integer, boolean, numeric, jsonb } from "drizzle-orm/pg-core";
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
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  ticketPrice: numeric("ticket_price", { precision: 10, scale: 2 }),
  ticketCapacity: integer("ticket_capacity"),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  checkoutFields: jsonb("checkout_fields").$type<CheckoutField[]>().notNull().default([]),
  waiverText: text("waiver_text"),
});

export type CheckoutField = {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "date" | "textarea" | "select";
  required: boolean;
  options?: string[];
};

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  attendeeCount: true,
  createdAt: true,
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type DbEvent = typeof eventsTable.$inferSelect;
