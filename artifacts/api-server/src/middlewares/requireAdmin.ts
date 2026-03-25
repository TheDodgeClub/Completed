import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session as { userId: number } | null;
  if (!session?.userId) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, session.userId),
  });

  if (!user || !user.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}
