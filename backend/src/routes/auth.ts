import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { admins } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { verifyPassword, signToken } from "../lib/auth.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const [admin] = await db.select().from(admins).where(eq(admins.email, parsed.data.email));
  if (!admin) return c.json({ error: "Invalid credentials" }, 401);

  const valid = await verifyPassword(parsed.data.password, admin.passwordHash);
  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  const token = signToken({ id: admin.id, email: admin.email });
  return c.json({ token, admin: { id: admin.id, email: admin.email } });
});