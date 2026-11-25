// RJ-7.1 / RJ-7.3: apagamento efetivo de uma conta e dos dados (RGPD, artigo 17.º).
// Usado pelo botão "Apagar a minha conta" (server/routes/account.ts) e pela limpeza das contas
// gratuitas inativas (server/services/inactive-accounts.ts), para as duas fazerem exatamente o mesmo.

import Stripe from "stripe";
import { createClerkClient } from "@clerk/backend";
import { eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { users, agencyInvitations, adminAuditLog, incidents } from "../../shared/schema.js";
import { isStripeMissing } from "./account-logic.js";

export interface DeletableUser {
  id: number;
  email?: string | null;
  clerkUserId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

export type DeletionResult =
  | { ok: true }
  | { ok: false; stage: "stripe"; message: string };

/**
 * Apaga a conta. Se a subscrição do Stripe não puder ser cancelada, não apaga nada
 * (para nunca ficar uma cobrança ativa sem conta). Erros na base de dados são lançados.
 */
export async function deleteUserAccount(user: DeletableUser, reason: "self" | "inactive"): Promise<DeletionResult> {
  const userId = Number(user.id);

  // 1) Pagamentos: cancelar já a subscrição (para não voltar a cobrar) e apagar o cliente no
  //    Stripe. As faturas emitidas ficam no Stripe, que as guarda por obrigação legal.
  if (process.env.STRIPE_SECRET_KEY && (user.stripeSubscriptionId || user.stripeCustomerId)) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" as any });
    try {
      if (user.stripeSubscriptionId) await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    } catch (error: any) {
      if (!isStripeMissing(error)) {
        console.error("[account] stripe cancel failed:", error?.message);
        return { ok: false, stage: "stripe", message: "Não foi possível cancelar a subscrição. Nada foi apagado; tente novamente." };
      }
    }
    try {
      if (user.stripeCustomerId) await stripe.customers.del(user.stripeCustomerId);
    } catch (error: any) {
      if (!isStripeMissing(error)) console.warn("[account] stripe customer delete failed:", error?.message);
    }
  }

  // 2) Base de dados, numa só transação. Apagar o utilizador apaga em cascata os
  //    estabelecimentos, reviews, respostas, ligações, créditos, regras, agência própria, etc.
  //    (chaves estrangeiras da RJ-1.4). O resto (ligado por email) apaga-se à mão.
  const email = String(user.email || "").toLowerCase();
  // Tabelas sem chave estrangeira para users, ligadas por email ou por user_id (as que existirem
  // nesta base de dados). Saber antes evita que um DELETE numa tabela inexistente anule a transação.
  const { rows: cols } = await db.execute(sql`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND ((table_name IN ('leads', 'referrals') AND column_name = 'email')
        OR (table_name IN ('invoice_items', 'invoices', 'invoice_settings') AND column_name = 'user_id'))`);
  const has = (t: string, c: string) => (cols as any[]).some((r) => r.table_name === t && r.column_name === c);

  await db.transaction(async (tx) => {
    if (email) {
      await tx.delete(agencyInvitations).where(sql`lower(${agencyInvitations.email}) = ${email}`);
      // RJ-5.6: reportes por email sem conta associada (os da conta apagam-se em cascata).
      await tx.delete(incidents).where(sql`lower(${incidents.reporterEmail}) = ${email}`);
      for (const t of ["leads", "referrals"]) {
        if (has(t, "email")) await tx.execute(sql`DELETE FROM ${sql.identifier(t)} WHERE lower(email) = ${email}`);
      }
      // O registo de auditoria fica (é do backoffice), mas sem o email da pessoa.
      await tx.execute(sql`
        UPDATE admin_audit_log
        SET details = replace(details::text, ${String(user.email)}, '[apagado]')::jsonb
        WHERE details IS NOT NULL AND details::text ILIKE ${"%" + String(user.email) + "%"}`);
    }
    // Tabelas antigas sem chave estrangeira (módulo de faturação simulado, RJ-5.1).
    for (const t of ["invoice_items", "invoices", "invoice_settings"]) {
      if (has(t, "user_id")) await tx.execute(sql`DELETE FROM ${sql.identifier(t)} WHERE user_id = ${userId}`);
    }
    await tx.delete(users).where(eq(users.id, userId));
    await tx.insert(adminAuditLog).values({
      actorUserId: null, action: "account_deleted", targetUserId: null,
      details: { deletedUserId: userId, reason, at: new Date().toISOString() },
      ip: null,
    });
  });

  // 3) Login (Clerk): apagar a identidade, para a pessoa não ficar com uma conta de login órfã.
  if (process.env.CLERK_SECRET_KEY && user.clerkUserId) {
    try {
      await createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }).users.deleteUser(String(user.clerkUserId));
    } catch (error: any) {
      console.warn("[account] clerk delete failed (dados já apagados):", error?.message);
    }
  }

  console.log(`[account] user ${userId} deleted (${reason})`);
  return { ok: true };
}
