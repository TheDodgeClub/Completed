import { Router, type IRouter } from "express";
import { db, usersTable, eventsTable, attendanceTable } from "@workspace/db";
import { count } from "drizzle-orm";

const router: IRouter = Router();

/* GET /api/stats */
router.get("/", async (_req, res) => {
  const [members] = await db.select({ cnt: count() }).from(usersTable);
  const [events] = await db.select({ cnt: count() }).from(eventsTable);
  const [tickets] = await db.select({ cnt: count() }).from(attendanceTable);
  const records = await db.select().from(attendanceTable);
  const medalsAwarded = records.filter(r => r.earnedMedal).length;

  res.json({
    totalEvents: Number(events?.cnt ?? 0),
    totalMembers: Number(members?.cnt ?? 0),
    totalTicketsSold: Number(tickets?.cnt ?? 0),
    totalMedalsAwarded: medalsAwarded,
  });
});

export default router;
