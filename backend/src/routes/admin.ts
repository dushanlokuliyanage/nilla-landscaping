import { Hono } from "hono";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { accessLogs, activityLogs, admins, adminRoles, galleryProjects, inquiries, orders, products, quoteRates, quoteRequests, videos } from "../db/schema.js";
import { requireAuth, requirePermission, requireAnyPermission } from "../middleware/auth.js";
import { logActivity } from "../lib/logging.js";
import { hashPassword } from "../lib/auth.js";
import { parsePositiveId, readJson } from "../lib/validation.js";
import type { Env } from "../types.js";

export const adminRoutes = new Hono<{ Bindings: Env }>();
adminRoutes.use("*", requireAuth);

const backupDatasetNames = ["products", "gallery", "videos", "inquiries", "quotes", "orders", "logs"] as const;
type BackupDataset = typeof backupDatasetNames[number];
const isBackupDataset = (value: unknown): value is BackupDataset => typeof value === "string" && backupDatasetNames.includes(value as BackupDataset);
async function resetBackupSequence(db: ReturnType<typeof getDb>, table: "products" | "gallery_projects" | "videos" | "inquiries" | "quote_requests" | "orders" | "activity_logs" | "access_logs") {
  await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), EXISTS (SELECT 1 FROM "${table}"))`));
}

adminRoutes.get("/backup", requirePermission("backup.manage"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const rawDatasets = c.req.query("datasets");
  const requested = rawDatasets?.split(",").filter(isBackupDataset);
  if (rawDatasets && !requested?.length) return c.json({ error: "Select valid backup data sets" }, 400);
  const selected = requested?.length ? [...new Set(requested)] : [...backupDatasetNames];
  const from = c.req.query("from") ? new Date(`${c.req.query("from")}T00:00:00.000Z`) : null;
  const to = c.req.query("to") ? new Date(`${c.req.query("to")}T23:59:59.999Z`) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from > to)) return c.json({ error: "Choose a valid date range" }, 400);
  const datasets: Record<string, unknown> = {};
  const inRange = <T extends { createdAt: Date | string }>(rows: T[]) => rows.filter((row) => {
    const date = new Date(row.createdAt).getTime();
    return (!from || date >= from.getTime()) && (!to || date <= to.getTime());
  });
  for (const name of selected) {
    if (name === "products") datasets.products = await db.select().from(products);
    if (name === "gallery") datasets.gallery = inRange(await db.select().from(galleryProjects));
    if (name === "videos") datasets.videos = inRange(await db.select().from(videos));
    if (name === "inquiries") datasets.inquiries = inRange(await db.select().from(inquiries));
    if (name === "quotes") datasets.quotes = inRange(await db.select().from(quoteRequests));
    if (name === "orders") datasets.orders = inRange(await db.select().from(orders));
    if (name === "logs") datasets.logs = {
      activity: inRange(await db.select().from(activityLogs)),
      access: inRange(await db.select().from(accessLogs)),
    };
  }
  if (selected.includes("quotes")) datasets.quoteRates = await db.select().from(quoteRates);
  return c.json({ application: "nilla-garden", backupVersion: 1, createdAt: new Date().toISOString(), filters: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null }, datasets });
});

adminRoutes.post("/backup/restore", requirePermission("backup.manage"), async (c) => {
  const body = await c.req.json().catch(() => null) as { backup?: { application?: string; backupVersion?: number; filters?: { from?: string | null; to?: string | null }; datasets?: Record<string, unknown> }; datasets?: unknown; replace?: boolean } | null;
  const names = Array.isArray(body?.datasets) ? body.datasets.filter(isBackupDataset) : [];
  const backup = body?.backup;
  if (!backup || backup.application !== "nilla-garden" || backup.backupVersion !== 1 || !backup.datasets || !names.length || body?.replace !== true) return c.json({ error: "Invalid backup or restore selection" }, 400);
  if (backup.filters?.from || backup.filters?.to) return c.json({ error: "A date-filtered export cannot replace a full data set. Restore from an export without date filters." }, 400);
  for (const name of names) {
    const rows = name === "logs" ? (backup.datasets.logs as { activity?: unknown; access?: unknown } | undefined) : backup.datasets[name];
    const validRows = name === "logs" ? rows && typeof rows === "object" && Array.isArray((rows as { activity?: unknown }).activity) && Array.isArray((rows as { access?: unknown }).access) : Array.isArray(rows);
    if (!validRows || (name !== "logs" && (rows as unknown[]).some((row) => !row || typeof row !== "object"))) return c.json({ error: `Backup is missing valid ${name} data` }, 400);
  }
  if (names.includes("quotes") && !Array.isArray(backup.datasets.quoteRates)) return c.json({ error: "Backup is missing valid quote pricing data" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  for (const name of names) {
    if (name === "products") { await db.delete(products); const rows = backup.datasets.products as typeof products.$inferInsert[]; if (rows.length) await db.insert(products).values(rows); await resetBackupSequence(db, "products"); }
    if (name === "gallery") { await db.delete(galleryProjects); const rows = backup.datasets.gallery as typeof galleryProjects.$inferInsert[]; if (rows.length) await db.insert(galleryProjects).values(rows); await resetBackupSequence(db, "gallery_projects"); }
    if (name === "videos") { await db.delete(videos); const rows = backup.datasets.videos as typeof videos.$inferInsert[]; if (rows.length) await db.insert(videos).values(rows); await resetBackupSequence(db, "videos"); }
    if (name === "inquiries") { await db.delete(inquiries); const rows = backup.datasets.inquiries as typeof inquiries.$inferInsert[]; if (rows.length) await db.insert(inquiries).values(rows); await resetBackupSequence(db, "inquiries"); }
    if (name === "quotes") {
      await db.delete(quoteRequests); const quoteRows = backup.datasets.quotes as typeof quoteRequests.$inferInsert[]; if (quoteRows.length) await db.insert(quoteRequests).values(quoteRows);
      await db.delete(quoteRates); const rateRows = backup.datasets.quoteRates as typeof quoteRates.$inferInsert[]; if (rateRows.length) await db.insert(quoteRates).values(rateRows);
      await resetBackupSequence(db, "quote_requests");
    }
    if (name === "orders") { await db.delete(orders); const rows = backup.datasets.orders as typeof orders.$inferInsert[]; if (rows.length) await db.insert(orders).values(rows); await resetBackupSequence(db, "orders"); }
    if (name === "logs") {
      const logRows = backup.datasets.logs as { activity: typeof activityLogs.$inferInsert[]; access: typeof accessLogs.$inferInsert[] };
      await db.delete(activityLogs); if (logRows.activity.length) await db.insert(activityLogs).values(logRows.activity);
      await db.delete(accessLogs); if (logRows.access.length) await db.insert(accessLogs).values(logRows.access);
      await resetBackupSequence(db, "activity_logs"); await resetBackupSequence(db, "access_logs");
    }
  }
  await logActivity(c, "restored", "backup", null, { datasets: names });
  return c.json({ success: true, restored: names });
});

const accountSchema = z.object({
  email: z.email().trim().max(254),
  password: z.string().min(8).max(128),
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
  const parsed = roleSchema.safeParse(await readJson(c.req.raw));
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
  const parsed = roleSchema.omit({ key: true }).safeParse(await readJson(c.req.raw));
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
  const parsed = accountSchema.safeParse(await readJson(c.req.raw));
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
  const id = parsePositiveId(c.req.param("id"));
  const parsed = z.object({ role: z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/) }).safeParse(await readJson(c.req.raw));
  if (id === null || !parsed.success) return c.json({ error: "Invalid request" }, 400);
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
  const id = parsePositiveId(c.req.param("id"));
  const parsed = z.object({ isActive: z.boolean() }).safeParse(await readJson(c.req.raw));
  if (id === null || !parsed.success) return c.json({ error: "Invalid request" }, 400);
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
