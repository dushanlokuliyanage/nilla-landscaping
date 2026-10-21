import { Context, Next } from "hono";
import { verifyToken } from "../lib/auth.js";
import type { Env } from "../types.js";
import { getDb } from "../db/index.js";
import { admins } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { AdminIdentity } from "../types.js";
import { logAccess } from "../lib/logging.js";

export const rolePermissions = {
  owner: ["inquiries.read", "inquiries.manage", "products.manage", "orders.read", "orders.manage", "team.manage", "logs.read"],
  manager: ["inquiries.read", "inquiries.manage", "products.manage", "orders.read", "orders.manage", "logs.read"],
  staff: ["inquiries.read", "inquiries.manage", "orders.read", "orders.manage"],
} as const;

export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    await logAccess(c, "unknown", "unauthorized_request");
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = header.split(" ")[1];
  let payload: { id: number; email: string };
  try {
    payload = await verifyToken(token, c.env.JWT_SECRET);
  } catch {
    await logAccess(c, "unknown", "invalid_token");
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  const [admin] = await getDb(c.env.DATABASE_URL).select({ id: admins.id, email: admins.email, role: admins.role, isActive: admins.isActive }).from(admins).where(eq(admins.id, payload.id));
  if (!admin || !admin.isActive) {
    await logAccess(c, payload.email, "inactive_account", payload.id);
    return c.json({ error: "Account unavailable" }, 401);
  }
  c.set("admin", { id: admin.id, email: admin.email, role: admin.role } satisfies AdminIdentity);
  await next();
}

export function requirePermission(permission: string) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const admin = c.get("admin") as AdminIdentity | undefined;
    const permissions = rolePermissions[admin?.role as keyof typeof rolePermissions] ?? [];
    if (!permissions.includes(permission as never)) {
      if (admin) await logAccess(c, admin.email, "access_denied", admin.id);
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}
