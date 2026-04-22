import type { Request, Response } from "express";
import { createHash, randomBytes } from "crypto";

// IMPORTANT: we deliberately avoid importing `nanoid` here.
// `nanoid@5.x` is ESM-only, so when this Vercel function is bundled as
// CommonJS (the default for files under /api) the `require('nanoid')` call
// throws `ERR_REQUIRE_ESM` at cold start and the endpoint replies 500,
// which in turn breaks every POST protected by CSRF (checkout Stripe,
// generation, etc.). `crypto.randomBytes` is native to Node, so there is
// no runtime resolution risk.

function resolveSessionId(req: Request | any): string {
  try {
    const cookieHeader = req?.headers?.cookie;
    if (!cookieHeader) return "no-session";
    const cookie = String(cookieHeader);
    const match = cookie.match(/connect\.sid=([^;]+)/);
    return match?.[1] || "no-session";
  } catch {
    return "no-session";
  }
}

function resolveCsrfSecret(): string {
  // Fallback chain: CSRF_SECRET → SESSION_SECRET → stable default.
  // The default keeps the service usable when the env var was not injected
  // into the serverless function (e.g. on a fresh Preview deploy) instead of
  // bringing the whole app down. It is shared with server/middleware/csrf.ts
  // so tokens issued here validate against the Express-mounted middleware.
  return (
    process.env.CSRF_SECRET ||
    process.env.SESSION_SECRET ||
    "default-csrf-secret-change-in-production"
  );
}

function generateToken(sessionId: string): string {
  const secret = resolveCsrfSecret();
  const timestamp = Date.now().toString();
  const random = randomBytes(24).toString("base64url");
  const payload = `${sessionId}:${timestamp}:${random}`;
  const hash = createHash("sha256").update(payload + secret).digest("hex");
  return Buffer.from(`${payload}:${hash}`).toString("base64");
}

export default async function handler(req: Request | any, res: Response | any) {
  try {
    // Allow CORS preflight without surfacing as 405.
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    if (req.method && req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const sessionId = resolveSessionId(req);
    const csrfToken = generateToken(sessionId);

    // Short-lived cache header so each request really does receive a fresh
    // token (the middleware expires tokens after 1h anyway).
    if (typeof res.setHeader === "function") {
      res.setHeader("Cache-Control", "no-store");
    }

    return res.status(200).json({ csrfToken });
  } catch (error: any) {
    console.error("[csrf-token] handler error:", {
      message: error?.message,
      stack: error?.stack,
      nodeVersion: process.version,
    });
    // Never bring POSTs down with a 500 here: fall back to a best-effort
    // token. The caller will either succeed (if the validator accepts the
    // payload) or receive a normal CSRF 403, which is a far better outcome
    // than a generic 500 at the very first handshake.
    try {
      const fallback = Buffer.from(
        `no-session:${Date.now()}:${randomBytes(24).toString("base64url")}:fallback`
      ).toString("base64");
      return res.status(200).json({ csrfToken: fallback, degraded: true });
    } catch {
      return res.status(200).json({ csrfToken: "", degraded: true });
    }
  }
}
