import { Hono } from "hono";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { products } from "../db/schema.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { logActivity } from "../lib/logging.js";
import { parsePositiveId, readJson } from "../lib/validation.js";
import type { Env } from "../types.js";

const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).default(""),
  price: z.number().int().min(0),
  unit: z.string().trim().min(1).max(80).default("per kg"),
  images: z.array(z.string().trim().min(1).max(2000)).max(30).default([]),
  options: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        values: z.array(z.string().trim().min(1).max(100)).min(1).max(50),
      }).strict()
    ).max(30)
    .default([]),
  stockQuantity: z.number().int().min(0).default(0),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const productRoutes = new Hono<{ Bindings: Env }>();

// Public: all products
productRoutes.get("/", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const all = await db.select().from(products).orderBy(desc(products.createdAt));
  return c.json(all);
});

// Public: one product by slug
productRoutes.get("/:slug", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, c.req.param("slug")));
  if (!product) return c.json({ error: "Not found" }, 404);
  return c.json(product);
});

// Admin: create
productRoutes.post("/", requireAuth, requirePermission("products.manage"), async (c) => {
  const parsed = productSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb(c.env.DATABASE_URL);
  const base = slugify(parsed.data.name) || "product";
  let slug = base;
  let n = 1;
  while (
    (await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)))
      .length > 0
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const [created] = await db
    .insert(products)
    .values({ ...parsed.data, slug, inStock: parsed.data.stockQuantity > 0 })
    .returning();
  await logActivity(c, "created", "product", created.id, { name: created.name });
  return c.json(created, 201);
});

// Admin: update (slug stays the same so links don't break)
productRoutes.put("/:id", requireAuth, requirePermission("products.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid product ID" }, 400);
  const parsed = productSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb(c.env.DATABASE_URL);
  const [updated] = await db
    .update(products)
    .set({ ...parsed.data, inStock: parsed.data.stockQuantity > 0 })
    .where(eq(products.id, id))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  await logActivity(c, "updated", "product", updated.id, { name: updated.name });
  return c.json(updated);
});

// Admin: delete
productRoutes.delete("/:id", requireAuth, requirePermission("products.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid product ID" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const [deleted] = await db.delete(products).where(eq(products.id, id)).returning({ name: products.name });
  if (deleted) await logActivity(c, "deleted", "product", id, { name: deleted.name });
  return c.json({ success: true });
});
