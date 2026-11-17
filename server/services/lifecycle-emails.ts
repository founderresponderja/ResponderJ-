// RJ-3.3: envia os emails de ciclo de vida (teste a acabar, teste acabado, poucos créditos).
// Corre no agendamento diário (api/cron/sync-reviews.ts). Cada email sai uma só vez por período,
// graças ao registo em email_log.

import { sql } from "drizzle-orm";
import { db } from "../db.js";
import { sendMail, isMailerConfigured } from "./mailer.js";
import { lifecycleEmailsFor, lifecycleEmailContent } from "./lifecycle-logic.js";

export async function sendLifecycleEmails(options: { deadline?: number } = {}) {
  const stats = { candidates: 0, sent: 0, failed: 0, skipped: !isMailerConfigured() };
  if (stats.skipped) return stats;
  const deadline = options.deadline ?? Date.now() + 10000;
  const baseUrl = process.env.APP_BASE_URL || "https://www.responderja.pt";

  // Só quem pode precisar: período a acabar/acabado há pouco, ou com saldo baixo.
  const { rows } = await db.execute(sql`
    SELECT id, email, first_name, is_active, is_admin, is_super_admin, is_sandbox,
           subscription_plan, selected_plan, credits, current_period_end
    FROM users
    WHERE current_period_end BETWEEN now() - interval '2 days' AND now() + interval '45 days'
      AND coalesce(is_admin, false) = false AND coalesce(is_super_admin, false) = false AND is_sandbox = false
    LIMIT 2000`);

  for (const r of rows as any[]) {
    if (Date.now() > deadline) break;
    const todo = lifecycleEmailsFor({
      email: r.email, isActive: r.is_active, isAdmin: r.is_admin, isSuperAdmin: r.is_super_admin, isSandbox: r.is_sandbox,
      subscriptionPlan: r.subscription_plan, selectedPlan: r.selected_plan, credits: r.credits, currentPeriodEnd: r.current_period_end,
    });
    for (const item of todo) {
      stats.candidates++;
      // Reserva primeiro (evita duplicados se duas execuções se cruzarem).
      const { rows: claimed } = await db.execute(sql`
        INSERT INTO email_log (user_id, kind, ref, ok) VALUES (${r.id}, ${item.kind}, ${item.ref}, false)
        ON CONFLICT (user_id, kind, ref) DO NOTHING RETURNING id`);
      if (!(claimed as any[]).length) continue;
      const content = lifecycleEmailContent(item.kind, { firstName: r.first_name, credits: r.credits, currentPeriodEnd: r.current_period_end }, baseUrl);
      const result = await sendMail({ to: r.email, ...content });
      await db.execute(sql`UPDATE email_log SET ok = ${result.ok}, error = ${result.error || null} WHERE id = ${(claimed as any[])[0].id}`);
      if (result.ok) stats.sent++; else stats.failed++;
    }
  }
  return stats;
}
