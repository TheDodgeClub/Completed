import { Router, type IRouter } from "express";
import { db, postsTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

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

export default router;
