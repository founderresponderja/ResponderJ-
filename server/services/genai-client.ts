// Um só sítio onde se cria o cliente do Gemini (AI Studio ou Agent Platform; ver genai-config.ts).
import { GoogleGenAI } from "@google/genai";
import { resolveGenAIConfig } from "./genai-config.js";

let cached: GoogleGenAI | null = null;

export function genAIConfig() {
  return resolveGenAIConfig();
}

export function isGenAIConfigured(): boolean {
  return resolveGenAIConfig().configured;
}

/** Cliente partilhado. Devolve null se a IA não estiver configurada. */
export function getGenAI(): GoogleGenAI | null {
  if (cached) return cached;
  const cfg = resolveGenAIConfig();
  if (!cfg.configured) return null;
  cached = new GoogleGenAI(cfg.options as any);
  console.log(`[ia] cliente Gemini: ${cfg.description}`);
  return cached;
}

/** Para ficheiros que precisam sempre de um objeto: falha com mensagem clara no momento do pedido. */
export function requireGenAI(): GoogleGenAI {
  const client = getGenAI();
  if (!client) throw new Error("IA não configurada: defina GEMINI_PROVIDER=agent-platform e as credenciais na Vercel.");
  return client;
}

/** Objeto com a mesma forma de GoogleGenAI que só cria o cliente quando é usado. */
export const lazyGenAI: { models: GoogleGenAI["models"] } = {
  get models() {
    return requireGenAI().models;
  },
};
