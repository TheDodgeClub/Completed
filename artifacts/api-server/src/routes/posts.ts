import { Router, type IRouter } from "express";
import { db, postsTable, usersTable, postCommentsTable } from "@workspace/db";
import { desc, eq, asc } from "drizzle-orm";

const router: IRouter = Router();

/* GET /api/posts */
router.get("/", async (_req, res) => {
  const posts = await db.query.postsTable.findMany({
    orderBy: desc(postsTable.createdAt),
    with: { author: true },
  });

  const result = posts.map(p => ({
    id: p.id,
    title: p.title,
    content: p.content,
    imageUrl: p.imageUrl ?? null,
    createdAt: p.createdAt.toISOString(),
    authorName: p.author.name,
    isMembersOnly: p.isMembersOnly,
  }));

  res.json(result);
});

/* POST /api/posts */
router.post("/", async (req, res) => {
  const { title, content, imageUrl, isMembersOnly } = req.body;
  const adminUser = await db.query.usersTable.findFirst({
    where: eq(usersTable.isAdmin, true),
  });

  const authorId = adminUser?.id ?? 1;

  const [post] = await db
    .insert(postsTable)
    .values({ title, content, imageUrl, isMembersOnly: !!isMembersOnly, authorId })
    .returning();

  const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, post.authorId) });

  res.status(201).json({
    id: post.id,
    title: post.title,
    content: post.content,
    imageUrl: post.imageUrl ?? null,
    createdAt: post.createdAt.toISOString(),
    authorName: author?.name ?? "Admin",
    isMembersOnly: post.isMembersOnly,
  });
});

/* GET /api/posts/:id/comments */
router.get("/:id/comments", async (req, res) => {
  const postId = Number(req.params.id);
  const comments = await db.query.postCommentsTable.findMany({
    where: eq(postCommentsTable.postId, postId),
    with: { user: true },
    orderBy: asc(postCommentsTable.createdAt),
  });
  res.json(comments.map(c => ({
    id: c.id,
    postId: c.postId,
    userId: c.userId,
    authorName: c.user.name,
    authorAvatar: c.user.avatarUrl ?? null,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
  })));
});

/* POST /api/posts/:id/comments — requires auth */
router.post("/:id/comments", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const postId = Number(req.params.id);
  const { content } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

  const post = await db.query.postsTable.findFirst({ where: eq(postsTable.id, postId) });
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const [comment] = await db.insert(postCommentsTable)
    .values({ postId, userId, content: content.trim() })
    .returning();
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });

  res.status(201).json({
    id: comment.id,
    postId: comment.postId,
    userId: comment.userId,
    authorName: user?.name ?? "Member",
    authorAvatar: user?.avatarUrl ?? null,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
  });
});

export default router;
