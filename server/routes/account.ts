// RJ-7.1: os dados pessoais do titular (RGPD).
// GET  /api/account/export  -> todos os dados da conta num ficheiro JSON (artigos 15.º e 20.º)
// POST /api/account/delete  -> apagamento efetivo da conta e dos dados (artigo 17.º)
//
// Corre sempre como a própria pessoa (um membro de equipa não passa a ser o dono da agência
// nestas rotas, ver server/middleware/member-rules.ts).

import { Router } from "express";
import Stripe from "stripe";
import { createClerkClient } from "@clerk/backend";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  users, establishments, reviews, responses, responseLearningPatterns, responseTemplates,
  automationRules, creditTransactions, subscriptions, socialPlatformConnections,
  agencies, agencyMembers, agencyInvitations, qualityFeedback, referrals, adminAuditLog,
  incidents, incidentAttachments,
} from "../../shared/schema.js";
import { stripSecrets, deletionBlockedReason, confirmationMatches, isStripeMissing } from "../services/account-logic.js";

const router = Router();

router.get("/export", requireAuth, async (req: any, res) => {
  try {
    const userId = Number(req.user.id);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ message: "Conta não encontrada." });

    const ests = await db.select().from(establishments).where(eq(establishments.userId, userId));
    const estIds = ests.map((e) => e.id);
    const ownedAgencies = await db.select().from(agencies).where(eq(agencies.ownerId, userId));
    const agencyIds = ownedAgencies.map((a) => a.id);

    const [
      revs, resps, patterns, templates, rules, credits, subs, connections,
      memberships, invitationsSent, invitationsReceived, feedback, referralsMade,
    ] = await Promise.all([
      estIds.length ? db.select().from(reviews).where(inArray(reviews.establishmentId, estIds)) : Promise.resolve([]),
      db.select().from(responses).where(eq(responses.userId, userId)),
      db.select().from(responseLearningPatterns).where(eq(responseLearningPatterns.userId, userId)),
      db.select().from(responseTemplates).where(eq(responseTemplates.userId, userId)),
      db.select().from(automationRules).where(eq(automationRules.userId, userId)),
      db.select().from(creditTransactions).where(eq(creditTransactions.userId, userId)),
      db.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
      db.select().from(socialPlatformConnections).where(eq(socialPlatformConnections.userId, userId)),
      db.select().from(agencyMembers).where(eq(agencyMembers.userId, userId)),
      agencyIds.length ? db.select().from(agencyInvitations).where(inArray(agencyInvitations.agencyId, agencyIds)) : Promise.resolve([]),
      db.select().from(agencyInvitations).where(sql`lower(${agencyInvitations.email}) = ${String(user.email || "").toLowerCase()}`),
      db.select().from(qualityFeedback).where(eq(qualityFeedback.userId, userId)),
      db.select().from(referrals).where(eq(referrals.referrerId, userId)),
    ]);
    // RJ-5.6: reportes de erro feitos pela pessoa (na app ou por email), com as imagens.
    const myIncidents = await db.select().from(incidents)
      .where(sql`${incidents.userId} = ${userId} or lower(${incidents.reporterEmail}) = ${String(user.email || "").toLowerCase()}`);
    const myAttachments = myIncidents.length
      ? await db.select().from(incidentAttachments).where(inArray(incidentAttachments.incidentId, myIncidents.map((i) => i.id)))
      : [];

    // RJ-7.2: registo de consentimentos (o IP só existe como impressão).
    const { rows: consentRows } = await db.execute(sql`
      SELECT kind, version, granted, choices, source, created_at FROM consent_records
      WHERE user_id = ${userId} ORDER BY created_at`).catch(() => ({ rows: [] as any[] })) as { rows: any[] };

    const clean = (rows: any[]) => rows.map((r) => stripSecrets(r));
    const exportData = {
      about: {
        service: "Responder Já",
        exportedAt: new Date().toISOString(),
        legalBasis: "RGPD, artigos 15.º (acesso) e 20.º (portabilidade)",
        note: "Tokens de acesso às plataformas e outros segredos não são incluídos por segurança.",
      },
      account: stripSecrets(user),
      establishments: clean(ests),
      platformConnections: clean(connections),
      reviews: clean(revs),
      responses: clean(resps),
      learnedStyle: clean(patterns),
      responseTemplates: clean(templates),
      automationRules: clean(rules),
      creditTransactions: clean(credits),
      subscriptions: clean(subs),
      agencies: clean(ownedAgencies),
      agencyMemberships: clean(memberships),
      agencyInvitationsSent: clean(invitationsSent as any[]),
      agencyInvitationsReceived: clean(invitationsReceived),
      qualityFeedback: clean(feedback),
      referrals: clean(referralsMade),
      consents: consentRows,
      errorReports: myIncidents.map((i) => ({
        ...i,
        attachments: myAttachments.filter((a) => a.incidentId === i.id),
      })),
    };

    await db.insert(adminAuditLog).values({
      actorUserId: userId, action: "account_export", targetUserId: userId, details: null,
      ip: String(req.headers?.["x-forwarded-for"] || req.ip || "").split(",")[0].trim() || null,
    }).catch((e: any) => console.warn("[account] audit export failed:", e?.message));

    res.setHeader("Content-Disposition", `attachment; filename="responder-ja-dados-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(exportData);
  } catch (error: any) {
    console.error("[account] export failed:", error?.message);
    res.status(500).json({ message: "Não foi possível exportar os dados." });
  }
});

router.post("/delete", requireAuth, async (req: any, res) => {
  const userId = Number(req.user.id);
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ message: "Conta não encontrada." });

    const blocked = deletionBlockedReason(user as any);
    if (blocked) return res.status(403).json({ message: blocked, code: "ACCOUNT_DELETE_BLOCKED" });
    if (!confirmationMatches(user.email, req.body?.confirmEmail)) {
      return res.status(400).json({ message: "Para confirmar, escreva o email da conta.", code: "CONFIRMATION_MISMATCH" });
    }

    // 1) Pagamentos: cancelar já a subscrição (para não voltar a cobrar) e apagar o cliente no
    //    Stripe. As faturas emitidas ficam no Stripe, que as guarda por obrigação legal.
    if (process.env.STRIPE_SECRET_KEY && (user.stripeSubscriptionId || user.stripeCustomerId)) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" as any });
      try {
        if (user.stripeSubscriptionId) await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      } catch (error: any) {
        if (!isStripeMissing(error)) {
          console.error("[account] stripe cancel failed:", error?.message);
          return res.status(502).json({ message: "Não foi possível cancelar a subscrição. Nada foi apagado; tente novamente." });
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
        details: { deletedUserId: userId, at: new Date().toISOString() },
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

    console.log(`[account] user ${userId} deleted`);
    return res.json({ deleted: true });
  } catch (error: any) {
    console.error("[account] delete failed:", error?.message);
    return res.status(500).json({ message: "Não foi possível apagar a conta. Nada foi apagado na base de dados; tente novamente." });
  }
});

export default router;
