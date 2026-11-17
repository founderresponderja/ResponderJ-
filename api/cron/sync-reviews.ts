import type { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { reviewSyncService } from "../../server/services/review-sync-service.js";

/**
 * Agendamento diário (vercel.json → crons, 03:00 UTC): sincroniza as reviews de todas as ligações.
 * RJ-3.5: comparação do segredo em tempo constante e registo de cada execução em admin_audit_log
 * (ação "cron_sync"), visível no backoffice → Sincronizações.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req: Request, res: Response) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = String(req.headers.authorization || "");
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!cronSecret) {
    console.error("[cron] CRON_SECRET not configured; sync skipped");
    return res.status(503).json({ error: "Cron not configured." });
  }
  if (!secretMatches(bearerToken, cronSecret)) {
    console.warn("[cron] unauthorized sync-reviews call");
    return res.status(401).json({ error: "Unauthorized cron call." });
  }

  const started = Date.now();
  let result: { total: number } | null = null;
  let error: string | null = null;
  try {
    result = await reviewSyncService.syncAllConnectedPlatforms();
    console.log(`[cron] sync-reviews completed: ${result.total} new reviews in ${Date.now() - started}ms`);
  } catch (err: any) {
    error = err?.message || "Sync failed";
    console.error("[cron] sync-reviews failed:", error);
  }

  try {
    const { db } = await import("../../server/db.js");
    const { adminAuditLog } = await import("../../shared/schema.js");
    await db.insert(adminAuditLog).values({
      actorUserId: null,
      action: "cron_sync",
      details: { ok: !error, imported: result?.total ?? 0, error, durationMs: Date.now() - started },
    });
  } catch (logErr: any) {
    console.error("[cron] could not record run:", logErr?.message);
  }

  if (error) return res.status(500).json({ ok: false, error });
  return res.json({ ok: true, imported: result!.total });
}
