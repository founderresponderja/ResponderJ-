// RJ-7.3: contas gratuitas inativas (decisão de 24/11/2026). Corre no agendamento diário.
// 1) 30 dias antes dos 12 meses sem acesso: email de aviso (uma vez por período de inatividade).
// 2) Aos 12 meses, e só se o aviso saiu há pelo menos 30 dias: apaga a conta e os dados,
//    exatamente como o botão "Apagar a minha conta".
// Regras puras e testadas: server/services/retention-logic.ts (tests/retention-logic.test.ts).

import { sql } from "drizzle-orm";
import { db } from "../db.js";
import { sendMail, isMailerConfigured } from "./mailer.js";
import { deleteUserAccount } from "./account-deletion.js";
import {
  RETENTION_DAYS, INACTIVE_WARNING_DAYS,
  inactiveAccountAction, inactivityRef, inactiveDeletionDate, inactiveWarningContent,
} from "./retention-logic.js";

const MAX_WARNINGS_PER_RUN = 100;
const MAX_DELETIONS_PER_RUN = 10;

export async function processInactiveFreeAccounts(options: { now?: Date; deadline?: number } = {}) {
  const now = options.now ?? new Date();
  const deadline = options.deadline ?? Date.now() + 10000;
  const stats = { candidates: 0, warned: 0, deleted: 0, failed: 0, skipped: !isMailerConfigured() };
  // Sem email configurado não há aviso, e sem aviso nunca se apaga.
  if (stats.skipped) return stats;
  const baseUrl = process.env.APP_BASE_URL || "https://www.responderja.pt";
  const warnDays = RETENTION_DAYS.inactiveFreeAccounts - INACTIVE_WARNING_DAYS;

  // Só contas gratuitas, sem subscrição, que não são da equipa nem de teste, que não pertencem a
  // uma agência (como membro ativo ou dona) e sem acesso há pelo menos 11 meses.
  const { rows } = await db.execute(sql`
    SELECT u.id, u.email, u.first_name, u.clerk_user_id, u.stripe_customer_id, u.stripe_subscription_id,
           COALESCE(u.last_login_at, u.created_at) AS last_activity
    FROM users u
    WHERE COALESCE(u.subscription_plan, 'trial') IN ('trial', 'free')
      AND u.stripe_subscription_id IS NULL
      AND COALESCE(u.is_admin, false) = false AND COALESCE(u.is_super_admin, false) = false
      AND u.is_sandbox = false
      AND u.email NOT LIKE '%.invalid'
      AND NOT EXISTS (SELECT 1 FROM agency_members m WHERE m.user_id = u.id AND COALESCE(m.status, 'active') = 'active')
      AND NOT EXISTS (SELECT 1 FROM agencies a WHERE a.owner_id = u.id)
      AND COALESCE(u.last_login_at, u.created_at) < ${new Date(now.getTime() - warnDays * 24 * 3600 * 1000)}
    ORDER BY last_activity
    LIMIT 500`);

  for (const r of rows as any[]) {
    if (Date.now() > deadline) break;
    if (!r.last_activity) continue;
    stats.candidates++;
    const ref = inactivityRef(r.last_activity);
    const { rows: logs } = await db.execute(sql`
      SELECT sent_at FROM email_log
      WHERE user_id = ${r.id} AND kind = 'inactive_warning' AND ref = ${ref} AND ok = true
      LIMIT 1`);
    const warnedAt = (logs as any[])[0]?.sent_at ?? null;
    const action = inactiveAccountAction({ lastActivity: r.last_activity, warnedAt }, now);

    try {
      if (action === "warn" && stats.warned < MAX_WARNINGS_PER_RUN) {
        // Reserva primeiro (evita dois avisos se duas execuções se cruzarem).
        const { rows: claimed } = await db.execute(sql`
          INSERT INTO email_log (user_id, kind, ref, ok) VALUES (${r.id}, 'inactive_warning', ${ref}, false)
          ON CONFLICT (user_id, kind, ref) DO NOTHING RETURNING id`);
        if (!(claimed as any[]).length) continue;
        // A data indicada nunca é anterior a 30 dias depois do aviso.
        const deleteOn = new Date(Math.max(
          inactiveDeletionDate(r.last_activity).getTime(),
          now.getTime() + INACTIVE_WARNING_DAYS * 24 * 3600 * 1000,
        ));
        const content = inactiveWarningContent({ firstName: r.first_name }, deleteOn, baseUrl);
        const result = await sendMail({ to: r.email, ...content });
        // Se o envio falhar, o registo fica com ok = false e o aviso volta a ser tentado amanhã
        // (a linha falhada é apagada para não bloquear o ON CONFLICT).
        if (result.ok) {
          await db.execute(sql`UPDATE email_log SET ok = true, sent_at = now() WHERE id = ${(claimed as any[])[0].id}`);
          stats.warned++;
        } else {
          await db.execute(sql`DELETE FROM email_log WHERE id = ${(claimed as any[])[0].id}`);
          stats.failed++;
        }
      } else if (action === "delete" && stats.deleted < MAX_DELETIONS_PER_RUN) {
        const result = await deleteUserAccount({
          id: Number(r.id), email: r.email, clerkUserId: r.clerk_user_id,
          stripeCustomerId: r.stripe_customer_id, stripeSubscriptionId: r.stripe_subscription_id,
        }, "inactive");
        if (result.ok) stats.deleted++; else stats.failed++;
      }
    } catch (err: any) {
      stats.failed++;
      console.error(`[inactive-accounts] user ${r.id} failed:`, err?.message);
    }
  }

  console.log("[inactive-accounts]", JSON.stringify(stats));
  return stats;
}
