import { Router, type IRouter } from "express";
import { db, merchTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/* GET /api/merch */
router.get("/", async (_req, res) => {
  const products = await db.select().from(merchTable);
  const result = products.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    imageUrl: p.imageUrl ?? null,
    buyUrl: p.buyUrl ?? null,
    category: p.category,
    inStock: p.inStock,
  }));
  res.json(result);
});

export default router;
