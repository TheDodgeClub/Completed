import {
  db,
  usersTable,
  eventsTable,
  attendanceTable,
  streakNotificationsTable,
} from "@workspace/db";
import { eq, and, gte, lte, inArray, isNotNull } from "drizzle-orm";
import { logger } from "../lib/logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const PUSH_BATCH_SIZE = 100;

type EligibleMember = {
  userId: number;
  pushToken: string;
  currentStreak: number;
};

/**
 * Given a list of past events (ordered oldest→newest) and a user's attended
 * event IDs, returns that user's current streak (events attended consecutively
 * up to and including the most recent event).
 */
function computeCurrentStreak(
  attendedIds: Set<number>,
  pastEventsOldestFirst: { id: number }[],
): number {
  let streak = 0;
  for (const event of pastEventsOldestFirst) {
    if (attendedIds.has(event.id)) {
      streak++;
    } else {
      streak = 0;
    }
  }
  return streak;
}

/**
 * Returns all members who:
 * 1. Have notifications enabled and a valid Expo push token
 * 2. Have an active streak of ≥2 consecutive past events
 * 3. Have NOT already received a streak notification for this event
 */
export async function getEligibleStreakMembers(eventId: number): Promise<EligibleMember[]> {
  // Fetch all past events (ordered oldest→newest) up to now
  const now = new Date();
  const pastEvents = await db
    .select({ id: eventsTable.id })
    .from(eventsTable)
    .where(and(eq(eventsTable.isPublished, true), lte(eventsTable.date, now)))
    .orderBy(eventsTable.date);

  if (pastEvents.length === 0) return [];

  // Fetch all attendance records
  const attendance = await db
    .select({ userId: attendanceTable.userId, eventId: attendanceTable.eventId })
    .from(attendanceTable);

  // Build per-user attendance sets
  const attendedByUser = new Map<number, Set<number>>();
  for (const row of attendance) {
    if (!attendedByUser.has(row.userId)) attendedByUser.set(row.userId, new Set());
    attendedByUser.get(row.userId)!.add(row.eventId);
  }

  // Collect user IDs with streak ≥ 2
  const eligibleUserIds: { userId: number; streak: number }[] = [];
  for (const [userId, attendedIds] of attendedByUser) {
    const streak = computeCurrentStreak(attendedIds, pastEvents);
    if (streak >= 2) {
      eligibleUserIds.push({ userId, streak });
    }
  }

  if (eligibleUserIds.length === 0) return [];

  // Fetch users who have push enabled and valid token
  const userIdList = eligibleUserIds.map((u) => u.userId);
  const subscribedUsers = await db
    .select({ id: usersTable.id, pushToken: usersTable.pushToken })
    .from(usersTable)
    .where(
      and(
        inArray(usersTable.id, userIdList),
        eq(usersTable.notificationsEnabled, true),
        isNotNull(usersTable.pushToken),
      ),
    );

  const validUsers = subscribedUsers.filter(
    (u): u is { id: number; pushToken: string } =>
      typeof u.pushToken === "string" && u.pushToken.startsWith("ExponentPushToken["),
  );

  if (validUsers.length === 0) return [];

  // Exclude users already notified for this event
  const alreadyNotified = await db
    .select({ userId: streakNotificationsTable.userId })
    .from(streakNotificationsTable)
    .where(eq(streakNotificationsTable.eventId, eventId));

  const notifiedSet = new Set(alreadyNotified.map((r) => r.userId));
  const streakMap = new Map(eligibleUserIds.map((u) => [u.userId, u.streak]));

  return validUsers
    .filter((u) => !notifiedSet.has(u.id))
    .map((u) => ({
      userId: u.id,
      pushToken: u.pushToken,
      currentStreak: streakMap.get(u.id) ?? 2,
    }));
}

/**
 * Sends personalised streak notifications for a single event and records
 * each sent (event, user) pair to prevent future duplicates.
 * Returns the number of notifications sent.
 */
export async function sendStreakNotificationsForEvent(
  event: { id: number; title: string },
): Promise<number> {
  const eligible = await getEligibleStreakMembers(event.id);
  if (eligible.length === 0) return 0;

  const messages = eligible.map((m) => ({
    to: m.pushToken,
    title: "🔥 Keep your streak alive!",
    body: `Your ${m.currentStreak}-event streak is on the line — don't miss ${event.title}!`,
    data: { eventId: event.id, type: "streak_reminder" },
    sound: "default" as const,
    priority: "high" as const,
  }));

  let sent = 0;
  for (let i = 0; i < messages.length; i += PUSH_BATCH_SIZE) {
    const batch = messages.slice(i, i + PUSH_BATCH_SIZE);
    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batch),
      });
      sent += batch.length;
    } catch (err: unknown) {
      logger.error({ err, eventId: event.id }, "streak notification batch send failed");
    }
  }

  if (sent > 0) {
    // Record all sent notifications for deduplication
    const records = eligible.slice(0, sent).map((m) => ({
      eventId: event.id,
      userId: m.userId,
    }));
    await db
      .insert(streakNotificationsTable)
      .values(records)
      .onConflictDoNothing()
      .catch((err: unknown) =>
        logger.error({ err }, "Failed to record streak notification sent state"),
      );
  }

  logger.info({ eventId: event.id, sent }, "streak notifications sent");
  return sent;
}

/**
 * Scans for events starting in the 48–49h window and sends streak notifications.
 * Safe to call repeatedly — deduplication is handled by the DB.
 */
export async function runStreakNotificationJob(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 49 * 60 * 60 * 1000);

  const upcomingEvents = await db
    .select({ id: eventsTable.id, title: eventsTable.title })
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.isPublished, true),
        gte(eventsTable.date, windowStart),
        lte(eventsTable.date, windowEnd),
      ),
    );

  if (upcomingEvents.length === 0) return;

  logger.info({ count: upcomingEvents.length }, "streak job: checking events in 48–49h window");

  for (const event of upcomingEvents) {
    await sendStreakNotificationsForEvent(event).catch((err: unknown) => {
      logger.error({ err, eventId: event.id }, "streak job: error sending for event");
    });
  }
}
