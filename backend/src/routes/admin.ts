import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { accessLogs, activityLogs, admins, adminRoles } from "../db/schema.js";
import { requireAuth, requirePermission, requireAnyPermission } from "../middleware/auth.js";
import { logActivity } from "../lib/logging.js";
import { hashPassword } from "../lib/auth.js";
import type { Env } from "../types.js";

export const adminRoutes = new Hono<{ Bindings: Env }>();
adminRoutes.use("*", requireAuth);

const accountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/),
});

const roleSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(240).default(""),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string().regex(/^[a-z]+\.[a-z]+$/)).max(40),
});

adminRoutes.get("/roles", requireAnyPermission("roles.manage", "team.manage"), async (c) => {
  const rows = await getDb(c.env.DATABASE_URL).select().from(adminRoles).orderBy(adminRoles.name);
  return c.json(rows);
});

adminRoutes.post("/roles", requirePermission("roles.manage"), async (c) => {
  const parsed = roleSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid role details" }, 400);
  if (parsed.data.key === "owner") return c.json({ error: "The owner role is reserved" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const [existing] = await db.select({ key: adminRoles.key }).from(adminRoles).where(eq(adminRoles.key, parsed.data.key));
  if (existing) return c.json({ error: "A role with this key already exists" }, 409);
  const [created] = await db.insert(adminRoles).values(parsed.data).returning();
  await logActivity(c, "created", "role", created.key, { name: created.name });
  return c.json(created, 201);
});

adminRoutes.put("/roles/:key", requirePermission("roles.manage"), async (c) => {
  const parsed = roleSchema.omit({ key: true }).safeParse(await c.req.json());
  const key = c.req.param("key");
  if (!parsed.success) return c.json({ error: "Invalid role details" }, 400);
  if (key === "owner") return c.json({ error: "The owner role is protected" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const [role] = await db.select().from(adminRoles).where(eq(adminRoles.key, key));
  if (!role) return c.json({ error: "Role not found" }, 404);
  const [updated] = await db.update(adminRoles).set({ ...parsed.data, updatedAt: new Date() }).where(eq(adminRoles.key, key)).returning();
  await logActivity(c, "updated", "role", key, { name: updated.name });
  return c.json(updated);
});

adminRoutes.delete("/roles/:key", requirePermission("roles.manage"), async (c) => {
  const key = c.req.param("key");
  if (["owner", "manager", "staff"].includes(key)) return c.json({ error: "Built-in roles cannot be deleted" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const assigned = await db.select({ id: admins.id }).from(admins).where(eq(admins.role, key));
  if (assigned.length) return c.json({ error: "Reassign team members before deleting this role" }, 409);
  const [deleted] = await db.delete(adminRoles).where(eq(adminRoles.key, key)).returning({ key: adminRoles.key });
  if (!deleted) return c.json({ error: "Role not found" }, 404);
  await logActivity(c, "deleted", "role", key);
  return c.json({ success: true });
});

adminRoutes.get("/team", requirePermission("team.manage"), async (c) => {
  const rows = await getDb(c.env.DATABASE_URL).select({ id: admins.id, email: admins.email, role: admins.role, isActive: admins.isActive, createdAt: admins.createdAt }).from(admins).orderBy(desc(admins.createdAt));
  return c.json(rows);
});

adminRoutes.post("/team", requirePermission("team.manage"), async (c) => {
  const parsed = accountSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid account details" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const email = parsed.data.email.toLowerCase();
  const [existing] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email));
  if (existing) return c.json({ error: "An admin with this email already exists" }, 409);
  const [assignedRole] = await db.select({ key: adminRoles.key, isActive: adminRoles.isActive }).from(adminRoles).where(eq(adminRoles.key, parsed.data.role));
  if (!assignedRole?.isActive || parsed.data.role === "owner") return c.json({ error: "Choose an active non-owner role" }, 400);
  const [created] = await db.insert(admins).values({ email, passwordHash: await hashPassword(parsed.data.password), role: parsed.data.role }).returning({ id: admins.id, email: admins.email, role: admins.role, isActive: admins.isActive, createdAt: admins.createdAt });
  await logActivity(c, "created", "admin", created.id, { email, role: created.role });
  return c.json(created, 201);
});

adminRoutes.patch("/team/:id/role", requirePermission("team.manage"), async (c) => {
  const id = Number(c.req.param("id"));
  const parsed = z.object({ role: z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/) }).safeParse(await c.req.json());
  if (!Number.isInteger(id) || id < 1 || !parsed.success) return c.json({ error: "Invalid request" }, 400);
  const [target] = await getDb(c.env.DATABASE_URL).select({ id: admins.id, email: admins.email, role: admins.role }).from(admins).where(eq(admins.id, id));
  if (!target) return c.json({ error: "Admin not found" }, 404);
  if (target.role === "owner") return c.json({ error: "Owner role cannot be changed here" }, 400);
  const [validRole] = await getDb(c.env.DATABASE_URL).select({ key: adminRoles.key, isActive: adminRoles.isActive }).from(adminRoles).where(eq(adminRoles.key, parsed.data.role));
  if (!validRole?.isActive) return c.json({ error: "Choose an active role" }, 400);
  await getDb(c.env.DATABASE_URL).update(admins).set({ role: parsed.data.role }).where(eq(admins.id, id));
  await logActivity(c, "role_changed", "admin", id, { email: target.email, from: target.role, to: parsed.data.role });
  return c.json({ success: true });
});

adminRoutes.patch("/team/:id/status", requirePermission("team.manage"), async (c) => {
  const id = Number(c.req.param("id"));
  const parsed = z.object({ isActive: z.boolean() }).safeParse(await c.req.json());
  if (!Number.isInteger(id) || id < 1 || !parsed.success) return c.json({ error: "Invalid request" }, 400);
  const [target] = await getDb(c.env.DATABASE_URL).select({ id: admins.id, email: admins.email, role: admins.role, isActive: admins.isActive }).from(admins).where(eq(admins.id, id));
  if (!target) return c.json({ error: "Admin not found" }, 404);
  if (target.role === "owner" || id === (c.get("admin") as { id: number }).id) return c.json({ error: "This account cannot be changed here" }, 400);
  await getDb(c.env.DATABASE_URL).update(admins).set({ isActive: parsed.data.isActive }).where(eq(admins.id, id));
  await logActivity(c, parsed.data.isActive ? "activated" : "deactivated", "admin", id, { email: target.email });
  return c.json({ success: true });
});

adminRoutes.get("/activity-logs", requirePermission("logs.read"), async (c) => {
  const rows = await getDb(c.env.DATABASE_URL).select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(200);
  return c.json(rows);
});

adminRoutes.get("/access-logs", requirePermission("logs.read"), async (c) => {
  const rows = await getDb(c.env.DATABASE_URL).select().from(accessLogs).orderBy(desc(accessLogs.createdAt)).limit(200);
  return c.json(rows);
});
