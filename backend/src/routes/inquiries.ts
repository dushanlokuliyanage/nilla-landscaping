import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { inquiries } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { sendInquiryNotification, sendCustomerConfirmation } from "../lib/email.js";

const inquirySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  service: z.string().optional(),
  message: z.string().min(5),
});

export const inquiryRoutes = new Hono();

// Public — submit inquiry (from Next.js contact form)
inquiryRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const [created] = await db.insert(inquiries).values(parsed.data).returning();

  // fire-and-forget emails; don't block the response on them
  sendInquiryNotification(parsed.data).catch(console.error);
  sendCustomerConfirmation(parsed.data).catch(console.error);

  return c.json({ success: true, id: created.id }, 201);
});

// Protected — admin panel routes
inquiryRoutes.get("/", requireAuth, async (c) => {
  const all = await db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
  return c.json(all);
});

inquiryRoutes.patch("/:id/read", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  await db.update(inquiries).set({ isRead: true }).where(eq(inquiries.id, id));
  return c.json({ success: true });
});

inquiryRoutes.delete("/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(inquiries).where(eq(inquiries.id, id));
  return c.json({ success: true });
});