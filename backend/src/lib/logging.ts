import { getDb } from "../db/index.js";
import { accessLogs, activityLogs } from "../db/schema.js";
import type { Context } from "hono";
import type { Env } from "../types.js";

export async function logActivity(
  c: Context<{ Bindings: Env }>,
  action: string,
  entity: string,
  entityId?: string | number,
  details: Record<string, unknown> = {},
) {
  const admin = c.get("admin") as { id: number; email: string };
  await getDb(c.env.DATABASE_URL).insert(activityLogs).values({
    adminId: admin.id,
    adminEmail: admin.email,
    action,
    entity,
    entityId: entityId == null ? null : String(entityId),
    details,
  });
}

export async function logAccess(
  c: Context<{ Bindings: Env }>,
  email: string,
  event: string,
  adminId?: number | null,
) {
  await getDb(c.env.DATABASE_URL).insert(accessLogs).values({
    adminId: adminId ?? null,
    email: email.slice(0, 320),
    event,
    ipAddress: c.req.header("CF-Connecting-IP") ?? null,
    userAgent: c.req.header("User-Agent")?.slice(0, 1000) ?? null,
  });
}
