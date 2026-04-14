import type { Request, Response } from "express";
import { createHash } from "crypto";
import { nanoid } from "nanoid";

function resolveSessionId(req: Request) {
  const cookie = String(req.headers.cookie || "");
  const match = cookie.match(/connect\.sid=([^;]+)/);
  return match?.[1] || "no-session";
}

function generateToken(sessionId: string) {
  const secret = process.env.CSRF_SECRET || process.env.SESSION_SECRET || "default-csrf-secret-change-in-production";
  const timestamp = Date.now().toString();
  const random = nanoid(32);
  const payload = `${sessionId}:${timestamp}:${random}`;
  const hash = createHash("sha256").update(payload + secret).digest("hex");
  return Buffer.from(`${payload}:${hash}`).toString("base64");
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const csrfToken = generateToken(resolveSessionId(req));
  return res.status(200).json({ csrfToken });
}
