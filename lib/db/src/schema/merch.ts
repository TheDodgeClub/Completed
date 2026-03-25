import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const merchTable = pgTable("merch", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  buyUrl: text("buy_url"),
  category: text("category").notNull().default("apparel"),
  inStock: boolean("in_stock").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMerchSchema = createInsertSchema(merchTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMerch = z.infer<typeof insertMerchSchema>;
export type Merch = typeof merchTable.$inferSelect;
