import express from "express";
import type { Request, Response } from "express";
import { registerRoutes, setupAuthRoutes } from "../server/routes.js";
import { GoogleGenAI } from "@google/genai";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../server/db.js";

const app = express();
let initialized = false;
let initializing: Promise<void> | null = null;
let migrationsRun = false;
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
    if (!migrationsRun) {
      await runStartupMigrations();
      migrationsRun = true;
    }

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
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = resolve(currentDir, "../migrations");

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const alreadyApplied = await pool.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1",
        [file]
      );
      if (alreadyApplied.rowCount && alreadyApplied.rowCount > 0) {
        continue;
      }

      const fullPath = resolve(migrationsDir, file);
      const sql = await readFile(fullPath, "utf8");
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      console.log(`[migrations] applied ${file}`);
    }
  } catch (error) {
    console.error("[migrations] startup migration failed", error);
    throw error;
  }
}

export default async function handler(req: Request, res: Response) {
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
