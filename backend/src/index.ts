import { Hono } from "hono";
import { cors } from "hono/cors";
import { inquiryRoutes } from "./routes/inquiries.js";
import { authRoutes } from "./routes/auth.js";
import type { Env } from "./types.js";

const app = new Hono<{ Bindings: Env }>();

app.use("/*", async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.FRONTEND_URL.split(",").map((s) => s.trim()),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });
  return corsMiddleware(c, next);
});

app.get("/", (c) => c.json({ status: "ok", service: "Nilla Garden API" }));

app.route("/api/inquiries", inquiryRoutes);
app.route("/api/auth", authRoutes);

export default app;