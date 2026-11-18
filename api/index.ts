import express from "express";
import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { ensureDatabaseConnection } from "../server/db.js";
import { retryOnce, withTimeout } from "../server/utils/timeout.js";
import { lazyGenAI, isGenAIConfigured, genAIConfig } from "../server/services/genai-client.js";

// RJ-8.3: a app é montada de novo em cada tentativa de arranque. Antes, se o arranque falhasse
// (ex.: base de dados a acordar), a promessa falhada ficava guardada e TODOS os pedidos seguintes
// dessa instância falhavam até a Vercel a reciclar.
let currentApp: any = null;
let initialized = false;
let initializing: Promise<void> | null = null;
let initMs: number | null = null;
const instanceStartedAt = Date.now();
const ai = lazyGenAI; // cliente único (AI Studio ou Agent Platform)

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

  const started = Date.now();
  initializing = (async () => {
    const app = express();
    // A base de dados Neon pode estar a "acordar" no primeiro pedido: tenta duas vezes.
    await retryOnce(() => ensureDatabaseConnection(), 800);

    await runStartupMigrations();

    const { setupAuthRoutes, registerRoutes } = await import("../server/routes.js");
    const { originCheck } = await import("../server/middleware/origin-check.js");

    // RJ-1.6: recusa pedidos que alteram dados vindos de outro site (CSRF).
    app.use(originCheck);

    // Stripe webhook must receive raw body for signature validation.
    app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
    // RJ-5.6: webhook de email do Resend (assinatura sobre o corpo cru) e reportes com até 2 imagens.
    app.use("/api/incidents/inbound-email", express.raw({ type: "*/*", limit: "1mb" }));
    app.use("/api/incidents", express.json({ limit: "4mb" }));
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: false, limit: "1mb" }));

    // RJ-8.2: regista as respostas 5xx da API (agrupadas) para o backoffice → Saúde técnica.
    const { recordAppError } = await import("../server/services/error-tracking.js");
    const { shouldRecordStatus, sanitizeClientError } = await import("../server/services/error-tracking-logic.js");
    app.use((req: any, res: any, next: any) => {
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        if (res.statusCode >= 500 && body && typeof body === "object") res.locals.errorMessage = body.message || body.error;
        return originalJson(body);
      };
      res.on("finish", () => {
        const path = String(req.originalUrl || req.url || "").split("?")[0];
        if (res.locals.errorRecorded || !shouldRecordStatus(res.statusCode, path)) return;
        recordAppError({
          source: "server",
          kind: "http_500",
          message: `${res.statusCode} ${req.method} ${String(res.locals.errorMessage || "").slice(0, 300)}`.trim(),
          path,
          userId: Number(req.user?.id) || null,
          sample: { status: res.statusCode, method: req.method },
        });
      });
      next();
    });

    // Erros do navegador (sem sessão obrigatória; limitado por IP).
    const clientErrorHits = new Map<string, { n: number; t: number }>();
    app.post("/api/client-errors", (req: any, res: any) => {
      const ip = String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
      const now = Date.now();
      const hit = clientErrorHits.get(ip);
      if (hit && now - hit.t < 60000 && hit.n >= 20) return res.status(204).end();
      clientErrorHits.set(ip, hit && now - hit.t < 60000 ? { n: hit.n + 1, t: hit.t } : { n: 1, t: now });
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
      const e = sanitizeClientError(body || {});
      recordAppError({ source: "client", kind: e.kind, message: e.message, path: e.path, sample: { stack: e.stack, userAgent: e.userAgent } });
      res.status(204).end();
    });

    await setupAuthRoutes(app);
    await registerRoutes(app);

    // Exceções que chegam ao fim da cadeia (next(err)).
    app.use((err: any, req: any, res: any, _next: any) => {
      res.locals.errorRecorded = true;
      recordAppError({
        source: "server",
        kind: "exception",
        message: String(err?.message || err || "erro"),
        path: String(req.originalUrl || req.url || "").split("?")[0],
        userId: Number(req.user?.id) || null,
        sample: { stack: String(err?.stack || "").slice(0, 4000) },
      });
      if (!res.headersSent) res.status(500).json({ message: "Erro interno." });
    });
    currentApp = app;
    initialized = true;
    initMs = Date.now() - started;
    console.log(`[cold-start] app pronta em ${initMs} ms`);
  })();

  try {
    await initializing;
  } catch (error) {
    // Não guardar a falha: o pedido seguinte tenta arrancar de novo.
    initializing = null;
    throw error;
  }
}

async function runStartupMigrations() {
  console.warn("[migrations] automatic startup migrations disabled");
}

export default async function handler(req: Request, res: Response) {
  // RJ-8.3: verificação de saúde rápida (sem montar a app): base de dados e tempo de arranque.
  if (req.method === "GET" && req.url?.split("?")[0] === "/api/health") {
    const t = Date.now();
    let database = "ok";
    try {
      await withTimeout(ensureDatabaseConnection(), 5000, "base de dados");
    } catch {
      database = "falha";
    }
    return res.status(database === "ok" ? 200 : 503).json({
      status: database === "ok" ? "ok" : "degradado",
      database,
      databaseMs: Date.now() - t,
      appReady: initialized,
      ai: genAIConfig().description,
      initMs,
      instanceAgeS: Math.round((Date.now() - instanceStartedAt) / 1000),
      time: new Date().toISOString(),
    });
  }

  // Fast-path chat endpoint in serverless to avoid heavy app bootstrap failures.
  if (req.method === "POST" && req.url?.startsWith("/api/ai/chat")) {
    try {
      const { message, history, language } = await readBody(req);
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      if (!isGenAIConfigured()) {
        return res.status(503).json({ error: "AI provider not configured" });
      }

      const lang: ChatLanguage = (["pt", "en", "es"].includes(language) ? language : "pt") as ChatLanguage;
      const recentHistory = Array.isArray(history) ? history.slice(-4) : [];
      const chatContext = recentHistory
        .map((msg: any) => `${msg.role === "user" ? "User" : "Sofia"}: ${msg.content}`)
        .join("\n");

      const prompt = `${chatContext}\nUser: ${message}\nSofia:`;
      const response = await withTimeout(ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: SOFIA_SYSTEM_INSTRUCTIONS[lang],
          temperature: 0.7,
          maxOutputTokens: 350,
        },
      }), 20000, "Sofia");

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

  try {
    await initApp();
  } catch (error: any) {
    console.error("[cold-start] arranque falhou:", error?.message);
    return res.status(503).json({ message: "Serviço a arrancar. Tente de novo dentro de alguns segundos." });
  }
  return currentApp(req, res);
}
