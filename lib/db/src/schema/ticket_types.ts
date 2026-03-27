import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const ticketTypesTable = pgTable("ticket_types", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull().default(0),
  quantity: integer("quantity"),
  quantitySold: integer("quantity_sold").notNull().default(0),
  saleStartsAt: timestamp("sale_starts_at"),
  saleEndsAt: timestamp("sale_ends_at"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TicketType = typeof ticketTypesTable.$inferSelect;
