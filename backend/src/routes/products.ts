import { Hono } from "hono";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { products } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import type { Env } from "../types.js";

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().default(""),
  price: z.number().int().min(0),
  unit: z.string().min(1).default("per kg"),
  images: z.array(z.string().min(1)).default([]),
  options: z
    .array(
      z.object({
        name: z.string().min(1),
        values: z.array(z.string().min(1)).min(1),
      })
    )
    .default([]),
  inStock: z.boolean().default(true),
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
productRoutes.post("/", requireAuth, async (c) => {
  const parsed = productSchema.safeParse(await c.req.json());
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
    .values({ ...parsed.data, slug })
    .returning();
  return c.json(created, 201);
});

// Admin: update (slug stays the same so links don't break)
productRoutes.put("/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  const parsed = productSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb(c.env.DATABASE_URL);
  const [updated] = await db
    .update(products)
    .set(parsed.data)
    .where(eq(products.id, id))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// Admin: delete
productRoutes.delete("/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env.DATABASE_URL);
  await db.delete(products).where(eq(products.id, id));
  return c.json({ success: true });
});