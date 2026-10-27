import { Hono } from "hono";
import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { galleryProjects } from "../db/schema.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { logActivity } from "../lib/logging.js";
import { parsePositiveId, readJson } from "../lib/validation.js";
import type { Env } from "../types.js";

const projectSchema = z.object({
  title: z.string().trim().min(2).max(160),
  category: z.string().trim().min(1).max(100).default("Landscaping"),
  description: z.string().trim().max(5000).default(""),
  location: z.string().trim().max(160).nullable().optional(),
  year: z.number().int().min(1990).max(2100).nullable().optional(),
  images: z.array(z.string().trim().min(1).max(2000)).max(30).default([]),
  isPublished: z.boolean().default(true),
});

const publishSchema = z.object({ isPublished: z.boolean() });

// Max 30: each update is one database call, and Workers Free allows 50 per request
const reorderSchema = z.object({ ids: z.array(z.number().int()).min(1).max(30) });

function toValues(data: z.infer<typeof projectSchema>) {
  return {
    title: data.title.trim(),
    category: data.category.trim(),
    description: data.description.trim(),
    location: data.location?.trim() || null,
    year: data.year ?? null,
    images: data.images,
    isPublished: data.isPublished,
  };
}

export const galleryRoutes = new Hono<{ Bindings: Env }>();

// Public: published projects, in your chosen order, newest first
galleryRoutes.get("/", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const rows = await db
    .select()
    .from(galleryProjects)
    .where(eq(galleryProjects.isPublished, true))
    .orderBy(asc(galleryProjects.sortOrder), desc(galleryProjects.createdAt));
  return c.json(rows);
});

// Admin: every project, including hidden ones
galleryRoutes.get("/all", requireAuth, requirePermission("products.manage"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const rows = await db
    .select()
    .from(galleryProjects)
    .orderBy(asc(galleryProjects.sortOrder), desc(galleryProjects.createdAt));
  return c.json(rows);
});

// Admin: create
galleryRoutes.post("/", requireAuth, requirePermission("products.manage"), async (c) => {
  const parsed = projectSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb(c.env.DATABASE_URL);
  const [created] = await db
    .insert(galleryProjects)
    .values(toValues(parsed.data))
    .returning();
  await logActivity(c, "created", "gallery_project", created.id, { title: created.title });
  return c.json(created, 201);
});

// Admin: save a new order (defined before "/:id" routes on purpose)
galleryRoutes.post("/reorder", requireAuth, requirePermission("products.manage"), async (c) => {
  const parsed = reorderSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: "Invalid order" }, 400);

  const db = getDb(c.env.DATABASE_URL);
  for (let i = 0; i < parsed.data.ids.length; i++) {
    await db
      .update(galleryProjects)
      .set({ sortOrder: i })
      .where(eq(galleryProjects.id, parsed.data.ids[i]));
  }
  return c.json({ success: true });
});

// Admin: update
galleryRoutes.put("/:id", requireAuth, requirePermission("products.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid gallery project ID" }, 400);
  const parsed = projectSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb(c.env.DATABASE_URL);
  const [updated] = await db
    .update(galleryProjects)
    .set(toValues(parsed.data))
    .where(eq(galleryProjects.id, id))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  await logActivity(c, "updated", "gallery_project", updated.id, { title: updated.title });
  return c.json(updated);
});

// Admin: show or hide on the public page
galleryRoutes.patch("/:id/published", requireAuth, requirePermission("products.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid gallery project ID" }, 400);
  const parsed = publishSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: "Invalid data" }, 400);

  const db = getDb(c.env.DATABASE_URL);
  const [updated] = await db
    .update(galleryProjects)
    .set({ isPublished: parsed.data.isPublished })
    .where(eq(galleryProjects.id, id))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  await logActivity(c, "updated", "gallery_project", updated.id, {
    title: updated.title,
    published: updated.isPublished,
  });
  return c.json(updated);
});

// Admin: delete
galleryRoutes.delete("/:id", requireAuth, requirePermission("products.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid gallery project ID" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const [deleted] = await db
    .delete(galleryProjects)
    .where(eq(galleryProjects.id, id))
    .returning({ title: galleryProjects.title });
  if (deleted) await logActivity(c, "deleted", "gallery_project", id, { title: deleted.title });
  return c.json({ success: true });
});
