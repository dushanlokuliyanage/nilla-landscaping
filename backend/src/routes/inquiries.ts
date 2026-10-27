import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { inquiries } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { logActivity } from "../lib/logging.js";
import { sendInquiryNotification, sendCustomerConfirmation } from "../lib/email.js";
import { parsePositiveId, readJson } from "../lib/validation.js";
import type { Env } from "../types.js";
import { verifyTurnstile } from "../lib/turnstile.js";

const inquirySchema = z.object({
  turnstileToken: z.string().min(1).max(2048),
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().max(254),
  phone: z.string().trim().max(40).optional(),
  service: z.string().trim().max(120).optional(),
  message: z.string().trim().min(5).max(5000),
});

const followUpSchema = z.object({
  status: z.enum(["new", "contacted", "quoted", "won", "lost"]),
  note: z.string().trim().max(2000).nullable(),
});

export const inquiryRoutes = new Hono<{ Bindings: Env }>();

inquiryRoutes.post("/", async (c) => {
  const body = await readJson(c.req.raw);
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  if (!await verifyTurnstile(c, parsed.data.turnstileToken)) return c.json({ error: "Security check failed. Please try again." }, 403);

  const db = getDb(c.env.DATABASE_URL);
  const { turnstileToken: _token, ...inquiry } = parsed.data;
  const [created] = await db.insert(inquiries).values(inquiry).returning();

  c.executionCtx.waitUntil(
    sendInquiryNotification(inquiry, c.env).catch(console.error)
  );
  c.executionCtx.waitUntil(
    sendCustomerConfirmation(inquiry, c.env).catch(console.error)
  );

  return c.json({ success: true, id: created.id }, 201);
});

inquiryRoutes.get("/", requireAuth, requirePermission("inquiries.read"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const all = await db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
  return c.json(all);
});

inquiryRoutes.patch("/:id/read", requireAuth, requirePermission("inquiries.manage"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid inquiry ID" }, 400);
  const [updated] = await db.update(inquiries).set({ isRead: true }).where(eq(inquiries.id, id)).returning({ id: inquiries.id });
  if (updated) await logActivity(c, "marked_read", "inquiry", id);
  return c.json({ success: true });
});

inquiryRoutes.patch("/:id/follow-up", requireAuth, requirePermission("inquiries.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid inquiry ID" }, 400);
  const parsed = followUpSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: "Invalid follow-up details" }, 400);

  const [updated] = await getDb(c.env.DATABASE_URL)
    .update(inquiries)
    .set({ followUpStatus: parsed.data.status, followUpNote: parsed.data.note?.trim() || null })
    .where(eq(inquiries.id, id))
    .returning({ id: inquiries.id });
  if (!updated) return c.json({ error: "Inquiry not found" }, 404);
  await logActivity(c, "follow_up_updated", "inquiry", id, { status: parsed.data.status });
  return c.json({ success: true });
});

inquiryRoutes.delete("/:id", requireAuth, requirePermission("inquiries.manage"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid inquiry ID" }, 400);
  const [deleted] = await db.delete(inquiries).where(eq(inquiries.id, id)).returning({ id: inquiries.id });
  if (deleted) await logActivity(c, "deleted", "inquiry", id);
  return c.json({ success: true });
});
