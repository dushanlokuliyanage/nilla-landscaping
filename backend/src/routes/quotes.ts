import { Hono } from "hono";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { quoteRates, quoteRequests } from "../db/schema.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { logActivity } from "../lib/logging.js";
import { sendCustomerQuote, sendQuoteReceivedConfirmation, sendQuoteRequestNotification } from "../lib/email.js";
import { parsePositiveId, readJson } from "../lib/validation.js";
import type { Env } from "../types.js";
import { verifyTurnstile } from "../lib/turnstile.js";

const services = ["grass", "interlock", "plants", "other"] as const;
const requestSchema = z.object({
  turnstileToken: z.string().min(1).max(2048),
  customerName: z.string().trim().min(2).max(120),
  email: z.email().trim().max(254),
  phone: z.string().trim().regex(/^[+()\d\s.-]{7,40}$/),
  address: z.string().trim().min(2).max(500),
  requestedServices: z.array(z.object({
    service: z.enum(services),
    description: z.string().trim().min(2).max(240),
    quantity: z.number().int().positive().max(100000),
    unit: z.enum(["sq ft", "plant", "job"]),
  })).min(1).max(10),
  message: z.string().trim().max(5000).default(""),
}).superRefine((data, ctx) => {
  const expectedUnit = { grass: "sq ft", interlock: "sq ft", plants: "plant", other: "job" } as const;
  data.requestedServices.forEach((item, index) => {
    if (expectedUnit[item.service] !== item.unit) ctx.addIssue({ code: "custom", path: ["requestedServices", index, "unit"], message: "Unit does not match the selected service" });
  });
});

const quoteLineSchema = z.object({
  service: z.enum(["grass", "interlock", "plants", "other", "transport"]),
  description: z.string().trim().min(1).max(240),
  quantity: z.number().positive().max(100000),
  unit: z.string().trim().min(1).max(32),
  rate: z.number().int().min(0).max(100000000),
});
const quoteUpdateSchema = z.object({
  quoteLines: z.array(quoteLineSchema).min(1).max(30),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  terms: z.string().trim().min(1).max(2000),
  warranty: z.string().trim().max(2000),
});
const rateSchema = z.object({
  rates: z.array(z.object({ key: z.enum(["grass", "interlock", "plants", "other", "transport"]), rate: z.number().int().min(0).max(100000000) })).length(5),
});

export const quoteRoutes = new Hono<{ Bindings: Env }>();

quoteRoutes.post("/", async (c) => {
  const parsed = requestSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  if (!await verifyTurnstile(c, parsed.data.turnstileToken)) return c.json({ error: "Security check failed. Please try again." }, 403);
  const { turnstileToken: _token, ...quoteRequest } = parsed.data;
  const [created] = await getDb(c.env.DATABASE_URL).insert(quoteRequests).values(quoteRequest).returning();
  c.executionCtx.waitUntil(sendQuoteRequestNotification(created, c.env).catch(console.error));
  c.executionCtx.waitUntil(sendQuoteReceivedConfirmation(created, c.env).catch(console.error));
  return c.json({ success: true, id: created.id, quoteNumber: created.id + 1350 }, 201);
});

quoteRoutes.get("/", requireAuth, requirePermission("inquiries.read"), async (c) => {
  const rows = await getDb(c.env.DATABASE_URL).select().from(quoteRequests).orderBy(desc(quoteRequests.createdAt));
  return c.json(rows.map((row) => ({ ...row, quoteNumber: row.id + 1350 })));
});

quoteRoutes.get("/rates", requireAuth, requirePermission("inquiries.read"), async (c) => {
  return c.json(await getDb(c.env.DATABASE_URL).select().from(quoteRates).orderBy(quoteRates.key));
});

quoteRoutes.post("/:id/distance", requireAuth, requirePermission("inquiries.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid quote request ID" }, 400);
  const [request] = await getDb(c.env.DATABASE_URL).select({ address: quoteRequests.address }).from(quoteRequests).where(eq(quoteRequests.id, id));
  if (!request) return c.json({ error: "Quote request not found" }, 404);
  const [transportRate] = await getDb(c.env.DATABASE_URL).select({ rate: quoteRates.rate }).from(quoteRates).where(eq(quoteRates.key, "transport"));
  const ratePerKm = transportRate?.rate ?? 300;
  if (!c.env.GOOGLE_MAPS_API_KEY) return c.json({ error: "Google Maps routing is not configured. Enter the driving distance manually." }, 503);
  const destination = /,\s*sri lanka\s*$/i.test(request.address) ? request.address : `${request.address}, Sri Lanka`;
  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": c.env.GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": "routes.distanceMeters" },
      body: JSON.stringify({ origin: { address: "Hanwella, Sri Lanka" }, destination: { address: destination }, travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE", languageCode: "en", units: "METRIC" }),
    });
    if (!response.ok) return c.json({ error: "Google Maps could not calculate this route. Enter the driving distance manually." }, 502);
    const data = await response.json() as { routes?: { distanceMeters?: number }[] };
    const meters = data.routes?.[0]?.distanceMeters;
    if (!meters || meters <= 0) return c.json({ error: "Google Maps did not find a route. Enter the driving distance manually." }, 404);
    const distanceKm = Math.round(meters / 100) / 10;
    return c.json({ origin: "Hanwella, Sri Lanka", destination: request.address, distanceKm, ratePerKm, travelCharge: Math.round(distanceKm * ratePerKm) });
  } catch (error) {
    console.error("Google Maps route calculation failed", error);
    return c.json({ error: "Could not contact Google Maps. Enter the driving distance manually." }, 502);
  }
});

quoteRoutes.put("/rates", requireAuth, requirePermission("inquiries.manage"), async (c) => {
  const parsed = rateSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: "Invalid quote rates" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  for (const item of parsed.data.rates) {
    await db.insert(quoteRates).values({ ...item, label: item.key, unit: item.key === "grass" || item.key === "interlock" ? "sq ft" : item.key === "plants" ? "plant" : item.key === "transport" ? "km" : "job", updatedAt: new Date() }).onConflictDoUpdate({ target: quoteRates.key, set: { rate: item.rate, updatedAt: new Date() } });
  }
  await logActivity(c, "rates_updated", "quote_rates", null);
  return c.json(await db.select().from(quoteRates).orderBy(quoteRates.key));
});

quoteRoutes.put("/:id", requireAuth, requirePermission("inquiries.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid quote request ID" }, 400);
  const parsed = quoteUpdateSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: "Invalid quotation details" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const [existing] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id));
  if (!existing) return c.json({ error: "Quote request not found" }, 404);
  if (["accepted", "declined"].includes(existing.status)) return c.json({ error: "This quote is closed and cannot be edited" }, 409);
  const total = parsed.data.quoteLines.reduce((sum, line) => sum + Math.round(line.quantity * line.rate), 0);
  const [updated] = await db.update(quoteRequests).set({ ...parsed.data, total, status: "draft", updatedAt: new Date() }).where(eq(quoteRequests.id, id)).returning();
  await logActivity(c, "quote_saved", "quote", id, { total });
  return c.json({ ...updated, quoteNumber: updated.id + 1350 });
});

quoteRoutes.post("/:id/send", requireAuth, requirePermission("inquiries.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid quote request ID" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const [quote] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id));
  if (!quote) return c.json({ error: "Quote request not found" }, 404);
  if (["accepted", "declined"].includes(quote.status)) return c.json({ error: "This quote is closed" }, 409);
  if (!quote.quoteLines.length) return c.json({ error: "Save the quotation before sending it" }, 400);
  if (quote.quoteLines.some((line) => line.service === "transport" && line.quantity <= 0)) return c.json({ error: "Enter a driving distance or remove the transportation line before sending" }, 400);
  if (quote.quoteLines.some((line) => line.service !== "transport" && line.rate <= 0)) return c.json({ error: "Set a positive rate for every work item before sending" }, 400);
  try {
    await sendCustomerQuote({ ...quote, quoteNumber: quote.id + 1350 }, c.env);
  } catch (error) {
    console.error("Failed to send customer quotation", error);
    return c.json({ error: error instanceof Error ? `Email could not be sent: ${error.message}` : "Email could not be sent. Check the email service configuration and try again." }, 502);
  }
  const [updated] = await db.update(quoteRequests).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(quoteRequests.id, id)).returning();
  await logActivity(c, "quote_sent", "quote", id, { email: quote.email, total: quote.total });
  return c.json({ ...updated, quoteNumber: updated.id + 1350 });
});

quoteRoutes.patch("/:id/status", requireAuth, requirePermission("inquiries.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid quote request ID" }, 400);
  const parsed = z.object({ status: z.enum(["accepted", "declined"]) }).safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: "Invalid quote status" }, 400);
  const [updated] = await getDb(c.env.DATABASE_URL).update(quoteRequests).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(quoteRequests.id, id)).returning();
  if (!updated) return c.json({ error: "Quote request not found" }, 404);
  await logActivity(c, `quote_${parsed.data.status}`, "quote", id);
  return c.json({ ...updated, quoteNumber: updated.id + 1350 });
});
