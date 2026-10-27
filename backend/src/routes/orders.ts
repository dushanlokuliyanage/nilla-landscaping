import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, inArray, and, gte, sql } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { orders, products, type OrderItem } from "../db/schema.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { logActivity } from "../lib/logging.js";
import { sendOrderNotification } from "../lib/email.js";
import { parsePositiveId, readJson } from "../lib/validation.js";
import type { Env } from "../types.js";

const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[+()\d\s.-]{7,40}$/),
  email: z.union([z.literal(""), z.email().max(254)]).optional(),
  address: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(2000).optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(100000),
        options: z.record(z.string(), z.string()).default({}),
      })
    )
    .min(1).max(100),
});

const statusSchema = z.object({
  status: z.enum(["new", "contacted", "completed", "cancelled"]),
});

export const orderRoutes = new Hono<{ Bindings: Env }>();

async function restoreStock(db: ReturnType<typeof getDb>, reserved: Map<number, number>) {
  await Promise.all([...reserved.entries()].map(([productId, quantity]) =>
    db.update(products)
      .set({ stockQuantity: sql`${products.stockQuantity} + ${quantity}`, inStock: true })
      .where(eq(products.id, productId))
  ));
}

function orderQuantities(items: OrderItem[]) {
  const quantities = new Map<number, number>();
  for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  return quantities;
}

// Public: customer sends an order request
orderRoutes.post("/", async (c) => {
  const parsed = orderSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const data = parsed.data;

  const db = getDb(c.env.DATABASE_URL);
  const ids = [...new Set(data.items.map((i) => i.productId))];
  const found = await db.select().from(products).where(inArray(products.id, ids));

  // Build items from the database, never trust prices sent by the browser
  const items: OrderItem[] = [];
  const requestedByProduct = new Map<number, number>();
  for (const line of data.items) {
    requestedByProduct.set(line.productId, (requestedByProduct.get(line.productId) ?? 0) + line.quantity);
  }
  for (const line of data.items) {
    const product = found.find((p) => p.id === line.productId);
    if (!product) return c.json({ error: "Product not found" }, 400);
    const requestedQuantity = requestedByProduct.get(product.id) ?? line.quantity;
    if (!product.inStock || product.stockQuantity <= 0) {
      return c.json({ error: `${product.name} is out of stock` }, 400);
    }
    if (requestedQuantity > product.stockQuantity) {
      return c.json({ error: `Only ${product.stockQuantity} units of ${product.name} are currently available` }, 400);
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

  const reserved = new Map<number, number>();
  try {
    for (const [productId, quantity] of requestedByProduct) {
      const [updatedProduct] = await db.update(products).set({
        stockQuantity: sql`${products.stockQuantity} - ${quantity}`,
        inStock: sql<boolean>`${products.stockQuantity} - ${quantity} > 0`,
      }).where(and(eq(products.id, productId), gte(products.stockQuantity, quantity))).returning({ stockQuantity: products.stockQuantity });
      if (!updatedProduct) {
        throw new Error("STOCK_CHANGED");
      }
      reserved.set(productId, quantity);
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
  } catch (error) {
    await restoreStock(db, reserved);
    if (error instanceof Error && error.message === "STOCK_CHANGED") {
      return c.json({ error: "Stock changed while you were placing the order. Please review your cart and try again." }, 409);
    }
    console.error(error);
    return c.json({ error: "Could not place the order. Please try again." }, 500);
  }
});

// Admin: list orders
orderRoutes.get("/", requireAuth, requirePermission("orders.read"), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const all = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return c.json(all);
});

// Admin: change status
orderRoutes.patch("/:id/status", requireAuth, requirePermission("orders.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid order ID" }, 400);
  const parsed = statusSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return c.json({ error: "Invalid status" }, 400);

  const db = getDb(c.env.DATABASE_URL);
  const [existing] = await db.select().from(orders).where(eq(orders.id, id));
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (existing.status === "cancelled" && parsed.data.status !== "cancelled") {
    return c.json({ error: "A cancelled order cannot be reopened. Create a new order instead." }, 400);
  }
  if (existing.status === "completed" && parsed.data.status !== "completed") {
    return c.json({ error: "A completed order cannot be changed." }, 400);
  }
  const [updated] = await db.update(orders).set({ status: parsed.data.status }).where(and(eq(orders.id, id), eq(orders.status, existing.status))).returning({ id: orders.id, status: orders.status });
  if (!updated) return c.json({ error: "Order status changed. Refresh and try again." }, 409);
  if (parsed.data.status === "cancelled" && existing.status !== "cancelled") {
    await restoreStock(db, orderQuantities(existing.items));
  }
  await logActivity(c, "status_changed", "order", id, { status: updated.status });
  return c.json({ success: true });
});

// Admin: delete
orderRoutes.delete("/:id", requireAuth, requirePermission("orders.manage"), async (c) => {
  const id = parsePositiveId(c.req.param("id"));
  if (id === null) return c.json({ error: "Invalid order ID" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const [existing] = await db.select().from(orders).where(eq(orders.id, id));
  if (!existing) return c.json({ error: "Not found" }, 404);
  const [deleted] = await db.delete(orders).where(and(eq(orders.id, id), eq(orders.status, existing.status))).returning({ id: orders.id });
  if (!deleted) return c.json({ error: "Order changed. Refresh and try again." }, 409);
  if (existing.status !== "cancelled" && existing.status !== "completed") {
    await restoreStock(db, orderQuantities(existing.items));
  }
  if (deleted) await logActivity(c, "deleted", "order", id);
  return c.json({ success: true });
});
