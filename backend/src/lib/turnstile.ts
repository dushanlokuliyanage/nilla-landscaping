import type { Context } from "hono";
import type { Env } from "../types.js";

type TurnstileContext = Context<{ Bindings: Env }>;

/** Verify a one-time Turnstile response. Missing server configuration fails closed. */
export async function verifyTurnstile(c: TurnstileContext, token: unknown) {
  const secret = c.env.TURNSTILE_SECRET_KEY;
  if (!secret || typeof token !== "string" || token.length === 0 || token.length > 2048) return false;

  const form = new URLSearchParams({ secret, response: token });
  const remoteIp = c.req.header("CF-Connecting-IP");
  if (remoteIp) form.set("remoteip", remoteIp);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean; hostname?: string };
    if (!result.success) return false;

    const allowedHosts = c.env.FRONTEND_URL.split(",")
      .map((origin) => { try { return new URL(origin.trim()).hostname; } catch { return ""; } })
      .filter(Boolean);
    return typeof result.hostname === "string" && allowedHosts.includes(result.hostname);
  } catch {
    return false;
  }
}
