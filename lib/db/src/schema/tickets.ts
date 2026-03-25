import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { eventsTable } from "./events";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  status: text("status").notNull().default("pending"), // pending | paid | cancelled | free
  ticketCode: text("ticket_code").notNull().unique(),
  checkedIn: boolean("checked_in").notNull().default(false),
  checkedInAt: timestamp("checked_in_at"),
  amountPaid: integer("amount_paid").notNull().default(0), // in cents
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Ticket = typeof ticketsTable.$inferSelect;
