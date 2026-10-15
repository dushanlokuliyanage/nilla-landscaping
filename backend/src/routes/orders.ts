import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, inArray } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { orders, products, type OrderItem } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { sendOrderNotification } from "../lib/email.js";
import type { Env } from "../types.js";

const orderSchema = z.object({
  customerName: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int(),
        quantity: z.number().int().min(1).max(100000),
        options: z.record(z.string(), z.string()).default({}),
      })
    )
    .min(1),
});

const statusSchema = z.object({
  status: z.enum(["new", "contacted", "completed", "cancelled"]),
});

export const orderRoutes = new Hono<{ Bindings: Env }>();

// Public: customer sends an order request
orderRoutes.post("/", async (c) => {
  const parsed = orderSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const data = parsed.data;

  const db = getDb(c.env.DATABASE_URL);
  const ids = [...new Set(data.items.map((i) => i.productId))];
  const found = await db.select().from(products).where(inArray(products.id, ids));

  // Build items from the database, never trust prices sent by the browser
  const items: OrderItem[] = [];
  for (const line of data.items) {
    const product = found.find((p) => p.id === line.productId);
    if (!product) return c.json({ error: "Product not found" }, 400);
    if (!product.inStock) {
      return c.json({ error: `${product.name} is out of stock` }, 400);
    }

    const options: Record<string, string> = {};
    for (const opt of product.options) {
      const chosen = line.options[opt.name];
      if (!chosen || !opt.values.includes(chosen)) {
        return c.json(
          { error: `Please choose a valid ${opt.name} for ${product.name}` },
          400
        );
      }
      options[opt.name] = chosen;
    }

    items.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      unit: product.unit,
      quantity: line.quantity,
      options,
    });
  }

  const [created] = await db
    .insert(orders)
    .values({
      customerName: data.customerName,
      phone: data.phone,
      email: data.email || null,
      address: data.address || null,
      note: data.note || null,
      items,
    })
    .returning();

  c.executionCtx.waitUntil(
    sendOrderNotification(created, c.env).catch(console.error)
  );

  return c.json({ success: true, id: created.id }, 201);
});

// Admin: list orders
orderRoutes.get("/", requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const all = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return c.json(all);
});

// Admin: change status
orderRoutes.patch("/:id/status", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  const parsed = statusSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid status" }, 400);

  const db = getDb(c.env.DATABASE_URL);
  await db.update(orders).set({ status: parsed.data.status }).where(eq(orders.id, id));
  return c.json({ success: true });
});

// Admin: delete
orderRoutes.delete("/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env.DATABASE_URL);
  await db.delete(orders).where(eq(orders.id, id));
  return c.json({ success: true });
});