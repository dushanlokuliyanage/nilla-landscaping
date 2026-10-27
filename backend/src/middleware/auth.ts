import { Context, Next } from "hono";
import { verifyToken } from "../lib/auth.js";
import type { Env } from "../types.js";
import { getDb } from "../db/index.js";
import { admins, adminRoles } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { AdminIdentity } from "../types.js";
import { logAccess } from "../lib/logging.js";

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
  const [role] = await getDb(c.env.DATABASE_URL).select({ permissions: adminRoles.permissions, isActive: adminRoles.isActive }).from(adminRoles).where(eq(adminRoles.key, admin.role));
  c.set("admin", { id: admin.id, email: admin.email, role: admin.role, permissions: admin.role === "owner" ? ["*"] : role?.isActive ? role.permissions : [] } satisfies AdminIdentity);
  await next();
}

export function requirePermission(permission: string) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const admin = c.get("admin") as AdminIdentity | undefined;
    const permissions = admin?.permissions ?? [];
    const [resource, action] = permission.split(".");
    const legacy = action === "read" ? `${resource}.read` : `${resource}.manage`;
    if (!permissions.includes("*") && !permissions.includes(permission) && !permissions.includes(legacy)) {
      if (admin) await logAccess(c, admin.email, "access_denied", admin.id);
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}

export function requireAnyPermission(...permissions: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const admin = c.get("admin") as AdminIdentity | undefined;
    if (!admin?.permissions.includes("*") && !permissions.some((permission) => admin?.permissions.includes(permission))) {
      if (admin) await logAccess(c, admin.email, "access_denied", admin.id);
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}
