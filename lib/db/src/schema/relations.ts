import { relations } from "drizzle-orm";
import { usersTable } from "./users";
import { eventsTable } from "./events";
import { attendanceTable } from "./attendance";
import { awardsTable } from "./awards";
import { postsTable } from "./posts";
import { teamHistoryTable } from "./team_history";
import { eventRegistrationsTable } from "./event_registrations";

export const usersRelations = relations(usersTable, ({ many }) => ({
  attendance: many(attendanceTable),
  awards: many(awardsTable),
  posts: many(postsTable),
  teamHistory: many(teamHistoryTable),
  eventRegistrations: many(eventRegistrationsTable),
}));

export const awardsRelations = relations(awardsTable, ({ one }) => ({
  user: one(usersTable, { fields: [awardsTable.userId], references: [usersTable.id] }),
}));

export const eventsRelations = relations(eventsTable, ({ many }) => ({
  attendance: many(attendanceTable),
  registrations: many(eventRegistrationsTable),
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  user: one(usersTable, { fields: [attendanceTable.userId], references: [usersTable.id] }),
  event: one(eventsTable, { fields: [attendanceTable.eventId], references: [eventsTable.id] }),
}));

export const postsRelations = relations(postsTable, ({ one }) => ({
  author: one(usersTable, { fields: [postsTable.authorId], references: [usersTable.id] }),
}));

export const teamHistoryRelations = relations(teamHistoryTable, ({ one }) => ({
  user: one(usersTable, { fields: [teamHistoryTable.userId], references: [usersTable.id] }),
}));

export const eventRegistrationsRelations = relations(eventRegistrationsTable, ({ one }) => ({
  user: one(usersTable, { fields: [eventRegistrationsTable.userId], references: [usersTable.id] }),
  event: one(eventsTable, { fields: [eventRegistrationsTable.eventId], references: [eventsTable.id] }),
}));
