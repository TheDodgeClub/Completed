import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string | null): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
}

/* GET /api/settings — public settings for the mobile app */
router.get("/", async (_req, res) => {
  const [homeVideoUrl, clubName, clubTagline] = await Promise.all([
    getSetting("homeVideoUrl"),
    getSetting("clubName"),
    getSetting("clubTagline"),
  ]);
  res.json({ homeVideoUrl, clubName, clubTagline });
});

/* GET /api/admin/settings — same as above but admin-gated */
router.get("/admin", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(settingsTable);
  const settings: Record<string, string | null> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json(settings);
});

/* PUT /api/admin/settings — update one or more settings */
router.put("/admin", requireAdmin, async (req, res) => {
  const updates = req.body as Record<string, string | null>;
  await Promise.all(Object.entries(updates).map(([key, value]) => setSetting(key, value)));
  const rows = await db.select().from(settingsTable);
  const settings: Record<string, string | null> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json(settings);
});

export { router as settingsRouter, getSetting };
