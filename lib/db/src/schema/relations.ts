import { relations } from "drizzle-orm";
import { usersTable } from "./users";
import { eventsTable } from "./events";
import { attendanceTable } from "./attendance";
import { awardsTable } from "./awards";
import { postsTable } from "./posts";

export const usersRelations = relations(usersTable, ({ many }) => ({
  attendance: many(attendanceTable),
  awards: many(awardsTable),
  posts: many(postsTable),
}));

export const awardsRelations = relations(awardsTable, ({ one }) => ({
  user: one(usersTable, { fields: [awardsTable.userId], references: [usersTable.id] }),
}));

export const eventsRelations = relations(eventsTable, ({ many }) => ({
  attendance: many(attendanceTable),
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  user: one(usersTable, { fields: [attendanceTable.userId], references: [usersTable.id] }),
  event: one(eventsTable, { fields: [attendanceTable.eventId], references: [eventsTable.id] }),
}));

export const postsRelations = relations(postsTable, ({ one }) => ({
  author: one(usersTable, { fields: [postsTable.authorId], references: [usersTable.id] }),
}));
