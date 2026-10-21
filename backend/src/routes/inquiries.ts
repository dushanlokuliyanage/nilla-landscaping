import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { inquiries } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { logActivity } from "../lib/logging.js";
import { sendInquiryNotification, sendCustomerConfirmation } from "../lib/email.js";
import type { Env } from "../types.js";

const inquirySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  service: z.string().optional(),
  message: z.string().min(5),
});

export const inquiryRoutes = new Hono<{ Bindings: Env }>();

inquiryRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const db = getDb(c.env.DATABASE_URL);
  const [created] = await db.insert(inquiries).values(parsed.data).returning();

  c.executionCtx.waitUntil(
    sendInquiryNotification(parsed.data, c.env).catch(console.error)
  );
  c.executionCtx.waitUntil(
    sendCustomerConfirmation(parsed.data, c.env).catch(console.error)
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
  const id = Number(c.req.param("id"));
  const [updated] = await db.update(inquiries).set({ isRead: true }).where(eq(inquiries.id, id)).returning({ id: inquiries.id });
  if (updated) await logActivity(c, "marked_read", "inquiry", id);
  return c.json({ success: true });
});

inquiryRoutes.delete("/:id", requireAuth, requirePermission("inquiries.manage"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = Number(c.req.param("id"));
  const [deleted] = await db.delete(inquiries).where(eq(inquiries.id, id)).returning({ id: inquiries.id });
  if (deleted) await logActivity(c, "deleted", "inquiry", id);
  return c.json({ success: true });
});
