import type { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { reviewSyncService } from "../../server/services/review-sync-service.js";

/**
 * Agendamento diário (vercel.json → crons, 03:00 UTC): sincroniza as reviews de todas as ligações
 * e corre as regras de respostas automáticas (RJ-3.4).
 * RJ-7.3: antes de tudo, apaga os dados que já passaram do prazo de conservação e trata as contas
 * gratuitas inativas (aviso por email 30 dias antes; apagamento aos 12 meses).
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

  // RJ-7.3: apagar primeiro o que já passou do prazo de conservação (rápido; não apaga contas).
  let retention: any = null;
  try {
    const { runRetention } = await import("../../server/services/retention.js");
    retention = await runRetention(new Date(started));
  } catch (err: any) {
    retention = { error: err?.message || "retention failed" };
    console.error("[cron] retention failed:", retention.error);
  }

  // RJ-7.3: contas gratuitas inativas: aviso 30 dias antes dos 12 meses; depois, apagamento.
  let inactiveAccounts: any = null;
  try {
    const { processInactiveFreeAccounts } = await import("../../server/services/inactive-accounts.js");
    inactiveAccounts = await processInactiveFreeAccounts({ now: new Date(started), deadline: started + 15000 });
  } catch (err: any) {
    inactiveAccounts = { error: err?.message || "inactive accounts failed" };
    console.error("[cron] inactive accounts failed:", inactiveAccounts.error);
  }

  let result: { total: number } | null = null;
  let error: string | null = null;
  try {
    result = await reviewSyncService.syncAllConnectedPlatforms();
    console.log(`[cron] sync-reviews completed: ${result.total} new reviews in ${Date.now() - started}ms`);
  } catch (err: any) {
    error = err?.message || "Sync failed";
    console.error("[cron] sync-reviews failed:", error);
  }

  // RJ-3.4: respostas automáticas (plano Pro e Agência) logo a seguir à sincronização,
  // até 10 s antes do limite de 60 s da função.
  let automation: any = null;
  try {
    const { automationService } = await import("../../server/services/automation-service.js");
    automation = await automationService.processNewReviewsBatch({ deadline: started + 50000 });
  } catch (err: any) {
    automation = { error: err?.message || "automation failed" };
    console.error("[cron] automation failed:", automation.error);
  }

  // RJ-3.3: emails de ciclo de vida (teste a acabar/acabado, poucos créditos).
  // RJ-13.2: avisos de prazo das reclamações (15 dias úteis).
  let complaintDeadlines: any = null;
  try {
    const { sendComplaintDeadlineAlerts } = await import("../../server/services/complaint-service.js");
    complaintDeadlines = await sendComplaintDeadlineAlerts({ deadline: started + 50000 });
  } catch (err: any) {
    complaintDeadlines = { error: err?.message || "complaint alerts failed" };
    console.error("[cron] complaint alerts failed:", complaintDeadlines.error);
  }

  let lifecycle: any = null;
  try {
    const { sendLifecycleEmails } = await import("../../server/services/lifecycle-emails.js");
    lifecycle = await sendLifecycleEmails({ deadline: started + 55000 });
  } catch (err: any) {
    lifecycle = { error: err?.message || "lifecycle failed" };
    console.error("[cron] lifecycle emails failed:", lifecycle.error);
  }

  try {
    const { db } = await import("../../server/db.js");
    const { adminAuditLog } = await import("../../shared/schema.js");
    await db.insert(adminAuditLog).values({
      actorUserId: null,
      action: "cron_sync",
      details: { ok: !error, imported: result?.total ?? 0, error, automation, lifecycle, retention, inactiveAccounts, complaintDeadlines, durationMs: Date.now() - started },
    });
  } catch (logErr: any) {
    console.error("[cron] could not record run:", logErr?.message);
  }

  if (error) return res.status(500).json({ ok: false, error });
  return res.json({ ok: true, imported: result!.total, automation, lifecycle });
}
