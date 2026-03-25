import { relations } from "drizzle-orm";
import { usersTable } from "./users";
import { eventsTable } from "./events";
import { attendanceTable } from "./attendance";
import { awardsTable } from "./awards";
import { postsTable } from "./posts";
import { teamHistoryTable } from "./team_history";
import { eventRegistrationsTable } from "./event_registrations";
import { messagesTable } from "./messages";
import { postCommentsTable } from "./post_comments";
import { userSessionsTable } from "./user_sessions";

export const usersRelations = relations(usersTable, ({ many }) => ({
  attendance: many(attendanceTable),
  awards: many(awardsTable),
  posts: many(postsTable),
  teamHistory: many(teamHistoryTable),
  eventRegistrations: many(eventRegistrationsTable),
  sentMessages: many(messagesTable, { relationName: "sender" }),
  receivedMessages: many(messagesTable, { relationName: "receiver" }),
  comments: many(postCommentsTable),
  sessions: many(userSessionsTable),
}));

export const userSessionsRelations = relations(userSessionsTable, ({ one }) => ({
  user: one(usersTable, { fields: [userSessionsTable.userId], references: [usersTable.id] }),
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  sender: one(usersTable, { fields: [messagesTable.senderId], references: [usersTable.id], relationName: "sender" }),
  receiver: one(usersTable, { fields: [messagesTable.receiverId], references: [usersTable.id], relationName: "receiver" }),
}));

export const postCommentsRelations = relations(postCommentsTable, ({ one }) => ({
  post: one(postsTable, { fields: [postCommentsTable.postId], references: [postsTable.id] }),
  user: one(usersTable, { fields: [postCommentsTable.userId], references: [usersTable.id] }),
}));

export const postsWithCommentsRelations = relations(postsTable, ({ many }) => ({
  comments: many(postCommentsTable),
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
