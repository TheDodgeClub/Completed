import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { eventsTable } from "./events";
import { ticketTypesTable } from "./ticket_types";
import { discountCodesTable } from "./discount_codes";

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
  checkoutData: jsonb("checkout_data").$type<Record<string, string>>(),
  giftRecipientEmail: text("gift_recipient_email"),
  ticketTypeId: integer("ticket_type_id").references(() => ticketTypesTable.id, { onDelete: "set null" }),
  discountCodeId: integer("discount_code_id").references(() => discountCodesTable.id, { onDelete: "set null" }),
  originalAmountPaid: integer("original_amount_paid"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Ticket = typeof ticketsTable.$inferSelect;
