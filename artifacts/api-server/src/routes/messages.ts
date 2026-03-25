import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable } from "@workspace/db";
import { and, desc, eq, or, sql } from "drizzle-orm";

const router: IRouter = Router();

/* GET /api/messages — list conversations for current user */
router.get("/", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const msgs = await db.query.messagesTable.findMany({
    where: or(eq(messagesTable.senderId, userId), eq(messagesTable.receiverId, userId)),
    with: { sender: true, receiver: true },
    orderBy: desc(messagesTable.createdAt),
  });

  const seen = new Set<number>();
  const conversations: {
    partnerId: number; partnerName: string; partnerAvatar: string | null;
    lastMessage: string; lastMessageAt: string; unreadCount: number;
  }[] = [];

  for (const m of msgs) {
    const partnerId = m.senderId === userId ? m.receiverId : m.senderId;
    if (seen.has(partnerId)) continue;
    seen.add(partnerId);
    const partner = m.senderId === userId ? m.receiver : m.sender;
    const unreadCount = msgs.filter(
      x => x.senderId === partnerId && x.receiverId === userId && !x.readAt
    ).length;
    conversations.push({
      partnerId,
      partnerName: partner.name,
      partnerAvatar: partner.avatarUrl ?? null,
      lastMessage: m.content,
      lastMessageAt: m.createdAt.toISOString(),
      unreadCount,
    });
  }

  res.json(conversations);
});

/* GET /api/messages/:partnerId — message thread */
router.get("/:partnerId", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const partnerId = Number(req.params.partnerId);

  const thread = await db.query.messagesTable.findMany({
    where: or(
      and(eq(messagesTable.senderId, userId), eq(messagesTable.receiverId, partnerId)),
      and(eq(messagesTable.senderId, partnerId), eq(messagesTable.receiverId, userId)),
    ),
    with: { sender: true, receiver: true },
    orderBy: messagesTable.createdAt,
  });

  await db.update(messagesTable)
    .set({ readAt: new Date() })
    .where(and(eq(messagesTable.senderId, partnerId), eq(messagesTable.receiverId, userId)));

  res.json(thread.map(m => ({
    id: m.id,
    senderId: m.senderId,
    senderName: m.sender.name,
    senderAvatar: m.sender.avatarUrl ?? null,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  })));
});

/* POST /api/messages/:partnerId — send message */
router.post("/:partnerId", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const receiverId = Number(req.params.partnerId);
  const { content } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

  const partner = await db.query.usersTable.findFirst({ where: eq(usersTable.id, receiverId) });
  if (!partner) { res.status(404).json({ error: "User not found" }); return; }

  const [msg] = await db.insert(messagesTable).values({ senderId: userId, receiverId, content: content.trim() }).returning();
  const sender = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });

  res.status(201).json({
    id: msg.id,
    senderId: msg.senderId,
    senderName: sender?.name ?? "Unknown",
    senderAvatar: sender?.avatarUrl ?? null,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
    readAt: null,
  });
});

export default router;
