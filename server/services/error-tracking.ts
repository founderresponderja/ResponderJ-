// RJ-8.2: registo de erros técnicos agrupados (tabela app_errors), visível no backoffice.
// Nunca pode partir o pedido que está a registar: a promessa nunca falha.
//
// Na Vercel, a função é CONGELADA assim que envia a resposta. Uma escrita deixada "em segundo plano"
// fica a meio e a ligação à base de dados expira (foi o que aconteceu a 18/11/2026). Por isso:
//  - quem puder, faz "await recordAppError(...)" ANTES de responder;
//  - nos outros casos, a escrita é registada no waitUntil da Vercel, que mantém a função viva até acabar.

/** waitUntil da Vercel (o mesmo que o pacote @vercel/functions usa), se existir neste ambiente. */
export function keepAlive(promise: Promise<unknown>): void {
  try {
    const ctx = (globalThis as any)[Symbol.for("@vercel/request-context")]?.get?.();
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(promise);
  } catch {
    // fora da Vercel (testes, local): a promessa corre na mesma
  }
}
import { sql } from "drizzle-orm";
import { db } from "../db.js";
import { errorFingerprint } from "./error-tracking-logic.js";

export function recordAppError(input: {
  source: "server" | "client";
  kind: string;
  message: string;
  path?: string | null;
  userId?: number | null;
  sample?: Record<string, unknown>;
}): Promise<void> {
  const fingerprint = errorFingerprint({ source: input.source, kind: input.kind, message: input.message, path: input.path });
  const write = db.execute(sql`
    INSERT INTO app_errors (fingerprint, source, kind, message, path, sample, last_user_id)
    VALUES (${fingerprint}, ${input.source}, ${input.kind}, ${input.message.slice(0, 500)}, ${input.path || null},
            ${JSON.stringify(input.sample || {})}::jsonb, ${input.userId ?? null})
    ON CONFLICT (fingerprint) DO UPDATE SET
      count = app_errors.count + 1,
      last_seen = now(),
      sample = EXCLUDED.sample,
      last_user_id = coalesce(EXCLUDED.last_user_id, app_errors.last_user_id),
      -- Voltou a acontecer depois de marcado como visto: reabre.
      resolved_at = NULL`)
    .then(() => undefined)
    .catch((e: any) => console.warn("[error-tracking] record failed:", e?.cause?.message || e?.message));
  keepAlive(write);
  return write;
}
