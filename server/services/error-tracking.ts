// RJ-8.2: registo de erros técnicos agrupados (tabela app_errors), visível no backoffice.
// Nunca pode partir o pedido que está a registar: tudo é "fire and forget".
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
}) {
  const fingerprint = errorFingerprint({ source: input.source, kind: input.kind, message: input.message, path: input.path });
  db.execute(sql`
    INSERT INTO app_errors (fingerprint, source, kind, message, path, sample, last_user_id)
    VALUES (${fingerprint}, ${input.source}, ${input.kind}, ${input.message.slice(0, 500)}, ${input.path || null},
            ${JSON.stringify(input.sample || {})}::jsonb, ${input.userId ?? null})
    ON CONFLICT (fingerprint) DO UPDATE SET
      count = app_errors.count + 1,
      last_seen = now(),
      sample = EXCLUDED.sample,
      last_user_id = coalesce(EXCLUDED.last_user_id, app_errors.last_user_id),
      -- Voltou a acontecer depois de marcado como visto: reabre.
      resolved_at = NULL`).catch((e: any) => console.warn("[error-tracking] record failed:", e?.cause?.message || e?.message));
}
