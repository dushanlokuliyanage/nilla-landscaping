import { Context, Next } from "hono";
import { verifyToken } from "../lib/auth.js";

export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = header.split(" ")[1];
  try {
    const payload = verifyToken(token);
    c.set("admin", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}