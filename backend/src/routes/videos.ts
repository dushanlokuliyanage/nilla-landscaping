import { Hono } from "hono";
import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { videos } from "../db/schema.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { logActivity } from "../lib/logging.js";
import { parsePositiveId, readJson } from "../lib/validation.js";
import type { Env } from "../types.js";

const videoSchema = z.object({
  title: z.string().trim().min(2).max(160),
  category: z.string().trim().min(1).max(100).default("Landscaping"),
  videoUrl: z
    .string()
    .url()
    .refine(
      (v) => v.startsWith("https://res.cloudinary.com/"),
      "Please upload the video with the uploader"
    ),
  posterUrl: z.union([z.literal(""), z.url()]).default(""),
  orientation: z.enum(["vertical", "landscape"]).default("vertical"),
  isPublished: z.boolean().default(true),
});

const publishSchema = z.object({ isPublished: z.boolean() });

// Max 30: each update is one database call, and Workers Free allows 50 per request
const reorderSchema = z.object({ ids: z.array(z.number().int()).min(1).max(30) });

function toValues(data: z.infer<typeof videoSchema>) {
  return {
    title: data.title.trim(),
    category: data.category.trim(),
    videoUrl: data.videoUrl,
    posterUrl: data.posterUrl,
    orientation: data.orientation,
    isPublished: data.isPublished,
  };
}

export const videoRoutes = new Hono<{ Bindings: Env }>();

// Public: published videos in your chosen order
videoRoutes.get("/", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const rows = await db
    .select()
    .from(videos)
    .where(eq(videos.isPublished, true))
    .orderBy(asc(videos.sortOrder), desc(videos.createdAt));
  return c.json(rows);
});

// Admin: everything, including hidden videos
videoRoutes.get("/all", requireAuth, requirePermission("products.manage"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const rows = await db
    .select()
    .from(videos)
    .orderBy(asc(videos.sortOrder), desc(videos.createdAt));
  return c.json(rows);
});

videoRoutes.post("/", requireAuth, requirePermission("products.manage"), async (c) => {
  const parsed = videoSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb(c.env.DATABASE_URL);
  const [created] = await db.insert(videos).values(toValues(parsed.data)).returning();
  await logActivity(c, "created", "video", created.id, { title: created.title });
  return c.json(created, 201);
});

// Defined before the "/:id" routes on purpose
videoRoutes.post("/reorder", requireAuth, requirePermission("products.manage"), async (c) => {
  const parsed = reorderSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: "Invalid order" }, 400);

  const db = getDb(c.env.DATABASE_URL);
  for (let i = 0; i < parsed.data.ids.length; i++) {
    await db.update(videos).set({ sortOrder: i }).where(eq(videos.id, parsed.data.ids[i]));
  }
  return c.json({ success: true });
});

videoRoutes.put("/:id", requireAuth, requirePermission("products.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid video ID" }, 400);
  const parsed = videoSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb(c.env.DATABASE_URL);
  const [updated] = await db
    .update(videos)
    .set(toValues(parsed.data))
    .where(eq(videos.id, id))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  await logActivity(c, "updated", "video", updated.id, { title: updated.title });
  return c.json(updated);
});

videoRoutes.patch("/:id/published", requireAuth, requirePermission("products.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid video ID" }, 400);
  const parsed = publishSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: "Invalid data" }, 400);

  const db = getDb(c.env.DATABASE_URL);
  const [updated] = await db
    .update(videos)
    .set({ isPublished: parsed.data.isPublished })
    .where(eq(videos.id, id))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  await logActivity(c, "updated", "video", updated.id, {
    title: updated.title,
    published: updated.isPublished,
  });
  return c.json(updated);
});

videoRoutes.delete("/:id", requireAuth, requirePermission("products.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid video ID" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const [deleted] = await db
    .delete(videos)
    .where(eq(videos.id, id))
    .returning({ title: videos.title });
  if (deleted) await logActivity(c, "deleted", "video", id, { title: deleted.title });
  return c.json({ success: true });
});
