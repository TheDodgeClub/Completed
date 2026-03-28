import { Router, type IRouter } from "express";
import { db, settingsTable, usersTable, videosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendTicketConfirmationEmail } from "../services/email";

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
  const [homeVideoUrl, clubName, clubTagline, featuredVideoEnabled, featuredVideoId, communityGuidelines, privacyPolicyContent, privacyPolicyLegacy, termsOfService] = await Promise.all([
    getSetting("homeVideoUrl"),
    getSetting("clubName"),
    getSetting("clubTagline"),
    getSetting("homeFeaturedVideoEnabled"),
    getSetting("homeFeaturedVideoId"),
    getSetting("communityGuidelines"),
    getSetting("privacyPolicyContent"),
    getSetting("privacyPolicy"),
    getSetting("termsOfService"),
  ]);
  const privacyPolicy = privacyPolicyContent ?? privacyPolicyLegacy;

  let featuredVideo: { id: number; title: string; url: string; thumbnailUrl: string | null } | null = null;
  if (featuredVideoEnabled === "true" && featuredVideoId) {
    const id = parseInt(featuredVideoId, 10);
    if (!isNaN(id)) {
      const [video] = await db
        .select()
        .from(videosTable)
        .where(eq(videosTable.id, id))
        .limit(1);
      if (video && video.isPublished) {
        featuredVideo = {
          id: video.id,
          title: video.title,
          url: video.url,
          thumbnailUrl: video.thumbnailUrl ?? null,
        };
      }
    }
  }

  res.json({ homeVideoUrl, clubName, clubTagline, featuredVideo, communityGuidelines, privacyPolicyContent: privacyPolicy, termsOfService });
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

/* POST /api/admin/settings/test-email — send a test confirmation email */
router.post("/admin/test-email", requireAdmin, async (req: any, res) => {
  const userId = req.session.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const targetEmail: string = (req.body?.email ?? "").trim() || user.email;
  const targetName = targetEmail === user.email ? (user.name ?? user.email) : targetEmail;

  try {
    await sendTicketConfirmationEmail({
      toEmail: targetEmail,
      toName: targetName,
      eventName: "Example Dodge Ball Night",
      eventDate: new Date(),
      eventLocation: "Dodge Club Arena, London",
      ticketCodes: ["TEST-1234"],
    });
    res.json({ ok: true, sentTo: targetEmail });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to send test email" });
  }
});

export { router as settingsRouter, getSetting };
