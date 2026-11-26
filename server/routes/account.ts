// RJ-7.1: os dados pessoais do titular (RGPD).
// GET  /api/account/export  -> todos os dados da conta num ficheiro JSON (artigos 15.º e 20.º)
//      ?format=html          -> os mesmos dados numa página legível
// POST /api/account/delete  -> apagamento efetivo da conta e dos dados (artigo 17.º)
//
// Corre sempre como a própria pessoa (um membro de equipa não passa a ser o dono da agência
// nestas rotas, ver server/middleware/member-rules.ts).

import { Router } from "express";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  users, establishments, reviews, responses, responseLearningPatterns, responseTemplates,
  automationRules, creditTransactions, subscriptions, socialPlatformConnections,
  agencies, agencyMembers, agencyInvitations, qualityFeedback, referrals, adminAuditLog,
  incidents, incidentAttachments, complaints,
} from "../../shared/schema.js";
import { stripSecrets, deletionBlockedReason, confirmationMatches, renderExportHtml } from "../services/account-logic.js";
import { deleteUserAccount } from "../services/account-deletion.js";

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

    // RJ-13.1: reclamações recebidas nos negócios da conta.
    const myComplaints = await db.select().from(complaints).where(eq(complaints.userId, userId));

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
      complaints: clean(myComplaints),
      errorReports: myIncidents.map((i) => ({
        ...i,
        attachments: myAttachments.filter((a) => a.incidentId === i.id),
      })),
    };

    await db.insert(adminAuditLog).values({
      actorUserId: userId, action: "account_export", targetUserId: userId, details: null,
      ip: String(req.headers?.["x-forwarded-for"] || req.ip || "").split(",")[0].trim() || null,
    }).catch((e: any) => console.warn("[account] audit export failed:", e?.message));

    const day = new Date().toISOString().slice(0, 10);
    if (req.query.format === "html") {
      // Versão legível (abre bem no telemóvel); mesmos dados.
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="responder-ja-dados-${day}.html"`);
      return res.send(renderExportHtml(exportData));
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="responder-ja-dados-${day}.json"`);
    // Com indentação: legível num editor de texto.
    res.send(JSON.stringify(exportData, null, 2));
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

    // Pagamentos (Stripe), base de dados e login (Clerk): ver server/services/account-deletion.ts.
    const result = await deleteUserAccount(user as any, "self");
    if (!result.ok) return res.status(502).json({ message: result.message });

    return res.json({ deleted: true });
  } catch (error: any) {
    console.error("[account] delete failed:", error?.message);
    return res.status(500).json({ message: "Não foi possível apagar a conta. Nada foi apagado na base de dados; tente novamente." });
  }
});

export default router;
