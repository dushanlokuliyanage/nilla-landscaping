import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { admins } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { verifyPassword, signToken } from "../lib/auth.js";
import { logAccess } from "../lib/logging.js";
import { readJson } from "../lib/validation.js";
import { requireAuth } from "../middleware/auth.js";
import type { Env } from "../types.js";
import { verifyTurnstile } from "../lib/turnstile.js";

const loginSchema = z.object({
  turnstileToken: z.string().min(1).max(2048),
  email: z.email().trim().max(254),
  password: z.string().min(6).max(128),
});

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post("/login", async (c) => {
  const body = await readJson(c.req.raw);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  if (!await verifyTurnstile(c, parsed.data.turnstileToken)) return c.json({ error: "Security check failed. Please try again." }, 403);

  const db = getDb(c.env.DATABASE_URL);
  const [admin] = await db.select().from(admins).where(eq(admins.email, parsed.data.email));
  if (!admin || !admin.isActive) {
    await logAccess(c, parsed.data.email, "login_failed", admin?.id);
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(parsed.data.password, admin.passwordHash);
  if (!valid) {
    await logAccess(c, admin.email, "login_failed", admin.id);
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await signToken({ id: admin.id, email: admin.email }, c.env.JWT_SECRET);
  await logAccess(c, admin.email, "login_success", admin.id);
  return c.json({ token, admin: { id: admin.id, email: admin.email, role: admin.role } });
});

authRoutes.get("/me", requireAuth, async (c) => c.json(c.get("admin")));

authRoutes.post("/logout", requireAuth, async (c) => {
  const admin = c.get("admin") as { id: number; email: string };
  await logAccess(c, admin.email, "logout", admin.id);
  return c.json({ success: true });
});
