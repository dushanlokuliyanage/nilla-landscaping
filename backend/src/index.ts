import { Hono } from "hono";
import { cors } from "hono/cors";
import { inquiryRoutes } from "./routes/inquiries.js";
import { authRoutes } from "./routes/auth.js";
import { productRoutes } from "./routes/products.js";
import { orderRoutes } from "./routes/orders.js";
import { adminRoutes } from "./routes/admin.js";
import type { Env } from "./types.js";
import { galleryRoutes } from "./routes/gallery.js";
import { videoRoutes } from "./routes/videos.js";
import { quoteRoutes } from "./routes/quotes.js";


const app = new Hono<{ Bindings: Env }>();

app.use("/*", async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.FRONTEND_URL.split(",").map((s) => s.trim()),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  return corsMiddleware(c, next);
});

app.use("/*", async (c, next) => {
  const clientIp = c.req.header("CF-Connecting-IP") ?? "unknown";
  const { success } = await c.env.RATE_LIMITER.limit({ key: clientIp });

  if (!success) {
    c.header("Retry-After", "60");
    return c.json({ error: "Too many requests. Please try again in a minute." }, 429);
  }

  return next();
});

app.get("/", (c) => c.json({ status: "ok", service: "Nilla Garden API" }));

app.route("/api/inquiries", inquiryRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/products", productRoutes);
app.route("/api/orders", orderRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/gallery", galleryRoutes);
app.route("/api/videos", videoRoutes);
app.route("/api/quotes", quoteRoutes);

export default app;
