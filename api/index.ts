import express from "express";
import type { Request, Response } from "express";
import { createHash, randomBytes } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { ensureDatabaseConnection } from "../server/db.js";

const app = express();
let initialized = false;
let initializing: Promise<void> | null = null;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

type ChatLanguage = "pt" | "en" | "es";

const SOFIA_SYSTEM_INSTRUCTIONS: Record<ChatLanguage, string> = {
  pt: `És a Sofia, a assistente virtual do Responder Já.
Responde sempre em Português de Portugal (PT-PT), de forma concisa, profissional e útil.
Ajuda PMEs com reviews, reputação online, onboarding e uso da plataforma.`,
  en: `You are Sofia, Responder Já virtual assistant.
Always answer in English, concise, professional and helpful.
Help SMEs with reviews, online reputation, onboarding and platform usage.`,
  es: `Eres Sofia, asistente virtual de Responder Já.
Responde siempre en español, de forma concisa, profesional y útil.
Ayuda a pymes con reseñas, reputación online, onboarding y uso de la plataforma.`,
};

async function readBody(req: Request): Promise<any> {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks: Uint8Array[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve());
    req.on("error", reject);
  });
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

async function initApp() {
  if (initialized) return;
  if (initializing) {
    await initializing;
    return;
  }

  initializing = (async () => {
    await ensureDatabaseConnection();

    await runStartupMigrations();

    const { setupAuthRoutes, registerRoutes } = await import("../server/routes.js");

    // Stripe webhook must receive raw body for signature validation.
    app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: false, limit: "1mb" }));

    await setupAuthRoutes(app);
    await registerRoutes(app);
    initialized = true;
  })();

  await initializing;
}

async function runStartupMigrations() {
  console.warn("[migrations] automatic startup migrations disabled");
}

// ---------------------------------------------------------------------------
// CSRF fast-path
// ---------------------------------------------------------------------------
// Because vercel.json rewrites every `/api/*` request to `/api/index`, the
// dedicated `api/csrf-token.ts` serverless function is never reached in
// production. Running this endpoint through `initApp()` means a cold DB / auth
// bootstrap failure surfaces as a 500 here and cascades into every POST that
// depends on a CSRF token (Stripe checkout, response generation, ...).
//
// This fast-path mirrors the logic of `api/csrf-token.ts` and runs BEFORE
// `initApp()`, so the handshake is always served even when the full Express
// app is unavailable. The token format is identical to the one produced by
// `server/middleware/csrf.ts::generateCSRFToken`, so the Express-mounted
// validator (when it does bootstrap) accepts tokens issued here.

function resolveSessionIdFromRequest(_req: Request): string {
  // CSRF tokens are intentionally NOT bound to express-session in
  // production. express-session is only mounted in the dev stack
  // (server/index.ts) and req.session is never used by the app.
  // Authentication is handled by Clerk JWT (requireAuth); CSRF only
  // needs to bind tokens to the secret + timestamp + random nonce.
  // Binding to a non-existent session would fail validation when
  // stale connect.sid cookies leak into production requests.
  return "no-session";
}

function resolveCsrfSecret(): string {
  return (
    process.env.CSRF_SECRET ||
    process.env.SESSION_SECRET ||
    "default-csrf-secret-change-in-production"
  );
}

function generateCsrfTokenFastPath(sessionId: string): string {
  const secret = resolveCsrfSecret();
  const timestamp = Date.now().toString();
  const random = randomBytes(24).toString("base64url");
  const payload = `${sessionId}:${timestamp}:${random}`;
  const hash = createHash("sha256").update(payload + secret).digest("hex");
  return Buffer.from(`${payload}:${hash}`).toString("base64");
}

function handleCsrfFastPath(req: Request, res: Response): boolean {
  const url = req.url || "";
  if (!url.startsWith("/api/csrf-token")) return false;

  try {
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return true;
    }
    if (req.method && req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return true;
    }

    const sessionId = resolveSessionIdFromRequest(req);
    const csrfToken = generateCsrfTokenFastPath(sessionId);
    if (typeof res.setHeader === "function") {
      res.setHeader("Cache-Control", "no-store");
    }
    res.status(200).json({ csrfToken });
    return true;
  } catch (error: any) {
    console.error("[csrf-token fast-path] handler error:", {
      message: error?.message,
      stack: error?.stack,
      nodeVersion: process.version,
    });
    try {
      const fallback = Buffer.from(
        `no-session:${Date.now()}:${randomBytes(24).toString("base64url")}:fallback`
      ).toString("base64");
      res.status(200).json({ csrfToken: fallback, degraded: true });
    } catch {
      res.status(200).json({ csrfToken: "", degraded: true });
    }
    return true;
  }
}

export default async function handler(req: Request, res: Response) {
  // Fast-path CSRF token endpoint — served without booting the Express app so
  // a DB/auth cold start cannot bring the CSRF handshake down.
  if (handleCsrfFastPath(req, res)) {
    return;
  }

  // Fast-path chat endpoint in serverless to avoid heavy app bootstrap failures.
  if (req.method === "POST" && req.url?.startsWith("/api/ai/chat")) {
    try {
      const { message, history, language } = await readBody(req);
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      if (!process.env.GEMINI_API_KEY && !process.env.API_KEY) {
        return res.status(503).json({ error: "AI provider not configured" });
      }

      const lang: ChatLanguage = (["pt", "en", "es"].includes(language) ? language : "pt") as ChatLanguage;
      const recentHistory = Array.isArray(history) ? history.slice(-4) : [];
      const chatContext = recentHistory
        .map((msg: any) => `${msg.role === "user" ? "User" : "Sofia"}: ${msg.content}`)
        .join("\n");

      const prompt = `${chatContext}\nUser: ${message}\nSofia:`;
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: SOFIA_SYSTEM_INSTRUCTIONS[lang],
          temperature: 0.7,
          maxOutputTokens: 350,
        },
      });

      return res.status(200).json({
        response: response.text || "",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error?.message || "Chat error",
      });
    }
  }

  await initApp();
  return app(req, res);
}
