import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import "dotenv/config";
import { inquiryRoutes } from "./routes/inquiries.js";
import { authRoutes } from "./routes/auth.js";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: [process.env.FRONTEND_URL!, "http://localhost:5173"], // 5173 = admin (Vite)
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.get("/", (c) => c.json({ status: "ok", service: "Nilla Garden API" }));

app.route("/api/inquiries", inquiryRoutes);
app.route("/api/auth", authRoutes);

const port = Number(process.env.PORT) || 8787;
serve({ fetch: app.fetch, port });
console.log(`Backend running on http://localhost:${port}`);