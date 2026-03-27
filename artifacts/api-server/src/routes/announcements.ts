import { Router } from "express";
import { db, announcementsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

/* GET /api/announcements — fetch recent club announcements (auth optional) */
router.get("/", async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  const announcements = await db
    .select()
    .from(announcementsTable)
    .orderBy(desc(announcementsTable.createdAt))
    .limit(30);
  res.json(announcements);
});

export default router;
