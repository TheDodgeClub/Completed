import { Router, type IRouter } from "express";
import { db, videosTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

/* GET /api/videos — published videos for mobile */
router.get("/", async (_req, res) => {
  const videos = await db
    .select()
    .from(videosTable)
    .where(eq(videosTable.isPublished, true))
    .orderBy(desc(videosTable.publishedAt));
  res.json(videos.map(v => ({
    id: v.id,
    title: v.title,
    description: v.description ?? null,
    url: v.url,
    thumbnailUrl: v.thumbnailUrl ?? null,
    publishedAt: v.publishedAt?.toISOString() ?? null,
  })));
});

export default router;
