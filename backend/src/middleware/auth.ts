import { Context, Next } from "hono";
import { verifyToken } from "../lib/auth.js";
import type { Env } from "../types.js";

export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = header.split(" ")[1];
  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    c.set("admin", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}