import { Router, type IRouter } from "express";
import { db, userSessionsTable } from "@workspace/db";

const router: IRouter = Router();

/* POST /api/sessions — record a completed app session */
router.post("/", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { duration, startedAt } = req.body as { duration?: number; startedAt?: string };
  if (!duration || duration < 5 || !startedAt) {
    res.status(400).json({ error: "duration (≥5s) and startedAt required" });
    return;
  }

  const [row] = await db
    .insert(userSessionsTable)
    .values({
      userId,
      duration: Math.round(duration),
      startedAt: new Date(startedAt),
      endedAt: new Date(),
    })
    .returning();

  res.status(201).json(row);
});

export default router;
