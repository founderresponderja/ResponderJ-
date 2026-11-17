/**
 * Contas-sandbox do backoffice ("Ver como cliente").
 *
 * Cada sandbox é um utilizador com is_sandbox = true e dados simulados:
 * estabelecimentos, reviews (PT/EN/ES, boas e más), respostas geradas e
 * ligações fictícias. "Repor dados" apaga tudo o que a sandbox tem e volta a criar.
 * Nunca têm login próprio: só um operador lá chega, através do cabeçalho X-View-As.
 */
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db.js";
import {
  agencies,
  agencyMembers,
  creditTransactions,
  establishments,
  responses,
  reviews,
  socialPlatformConnections,
  users,
} from "../../shared/schema.js";

export type SandboxKey = "trial" | "trial-expirado" | "starter" | "pro" | "agencia" | "membro";

interface SandboxDef {
  key: SandboxKey;
  label: string;
  description: string;
  plan: "trial" | "starter" | "pro" | "agency";
  credits: number;
  creditsUsed: number;
  periodDays: number; // fim do período a partir de agora (negativo = já expirou)
  establishments: { name: string; type: string; platforms: string[] }[];
}

export const SANDBOXES: SandboxDef[] = [
  {
    key: "trial", label: "Experimental", description: "7 dias grátis, 10 créditos, ainda a decorrer.",
    plan: "trial", credits: 7, creditsUsed: 3, periodDays: 5,
    establishments: [{ name: "Café Central", type: "cafe", platforms: ["google"] }],
  },
  {
    key: "trial-expirado", label: "Experimental expirado", description: "O período grátis terminou há 2 dias.",
    plan: "trial", credits: 0, creditsUsed: 10, periodDays: -2,
    establishments: [{ name: "Padaria Aurora", type: "bakery", platforms: ["google"] }],
  },
  {
    key: "starter", label: "Starter", description: "Plano Starter ativo: 50 respostas, 1 estabelecimento, até 2 plataformas.",
    plan: "starter", credits: 38, creditsUsed: 12, periodDays: 20,
    establishments: [{ name: "Restaurante O Farol", type: "restaurant", platforms: ["google"] }],
  },
  {
    key: "pro", label: "Pro", description: "Plano Pro ativo: 150 respostas, várias plataformas.",
    plan: "pro", credits: 104, creditsUsed: 46, periodDays: 20,
    establishments: [
      { name: "Hotel Miradouro", type: "hotel", platforms: ["google", "booking"] },
      { name: "Restaurante do Hotel Miradouro", type: "restaurant", platforms: ["google"] },
    ],
  },
  {
    key: "agencia", label: "Agência (dono)", description: "Plano Agência: 500 respostas, 3 de 5 clientes geridos, equipa com 1 membro.",
    plan: "agency", credits: 500, creditsUsed: 85, periodDays: 20,
    establishments: [
      { name: "Clínica Sorriso (cliente)", type: "clinic", platforms: ["google"] },
      { name: "Ginásio Atlântico (cliente)", type: "gym", platforms: ["google", "facebook"] },
      { name: "Loja Maré Surf (cliente)", type: "shop", platforms: ["google"] },
    ],
  },
  {
    key: "membro", label: "Membro de agência", description: "Membro da equipa da Agência Maré Digital, sem plano próprio.",
    plan: "agency", credits: 0, creditsUsed: 0, periodDays: 20,
    establishments: [],
  },
];

export const sandboxEmail = (key: SandboxKey) => `${key}@sandbox.responderja.invalid`;
export const SANDBOX_DAILY_AI_LIMIT = 50;

type Seed = { rating: number; lang: "pt" | "en" | "es"; author: string; text: string; daysAgo: number; replied?: string };

const REVIEW_POOL: Seed[] = [
  { rating: 5, lang: "pt", author: "Ana Martins", text: "Atendimento impecável e tudo muito fresco. Voltaremos com certeza!", daysAgo: 1 },
  { rating: 4, lang: "pt", author: "Rui Costa", text: "Gostei bastante, só achei a espera um pouco longa ao fim de semana.", daysAgo: 2 },
  { rating: 1, lang: "pt", author: "Carla Sousa", text: "Muito mau. Esperei 40 minutos e ninguém pediu desculpa. O preço também não justifica.", daysAgo: 3 },
  { rating: 2, lang: "pt", author: "João Pereira", text: "A comida veio fria e a casa de banho estava suja. Esperava mais.", daysAgo: 5 },
  { rating: 5, lang: "en", author: "Emma Wilson", text: "Lovely place, friendly staff and great value for money. Highly recommend!", daysAgo: 4 },
  { rating: 3, lang: "en", author: "James Brown", text: "Decent experience overall, but the music was too loud to have a conversation.", daysAgo: 8 },
  { rating: 1, lang: "en", author: "Sophie Taylor", text: "They charged us twice and refused to fix it on the spot. Avoid.", daysAgo: 10 },
  { rating: 5, lang: "es", author: "Lucía García", text: "¡Todo perfecto! El personal fue muy amable y el sitio precioso.", daysAgo: 6 },
  { rating: 2, lang: "es", author: "Javier López", text: "Servicio lento y el pedido llegó incompleto. No repetiré.", daysAgo: 12 },
  { rating: 4, lang: "pt", author: "Marta Ribeiro", text: "Muito simpáticos. Só falta estacionamento perto.", daysAgo: 20, replied: "Obrigado, Marta! Estamos a tratar de um acordo com o parque ao lado." },
  { rating: 5, lang: "pt", author: "Pedro Almeida", text: "Excelente em tudo. Parabéns à equipa!", daysAgo: 25, replied: "Muito obrigado, Pedro! Até breve." },
  { rating: 3, lang: "pt", author: "Sofia Lopes", text: "Razoável. Nada de especial, mas também nada de mal.", daysAgo: 30 },
];

const GENERATED = [
  { idx: 2, text: "Cara Carla, lamentamos muito a espera e a falta de atenção. Não é o padrão que queremos. Gostaríamos de falar consigo para compensar: escreva-nos, por favor.", status: "pending" },
  { idx: 0, text: "Obrigado, Ana! Ficamos muito felizes por ter gostado. Até à próxima visita!", status: "approved" },
  { idx: 4, text: "Thank you so much, Emma! We're delighted you enjoyed your visit. Hope to see you again soon.", status: "approved" },
] as const;

function rotate<T>(list: T[], offset: number): T[] {
  return list.map((_, i) => list[(i + offset) % list.length]);
}

export async function getSandboxUser(key: SandboxKey) {
  const [user] = await db.select().from(users).where(and(eq(users.email, sandboxEmail(key)), eq(users.isSandbox, true)));
  return user ?? null;
}

/** Apaga e volta a criar os dados de uma sandbox. */
export async function resetSandbox(key: SandboxKey) {
  const def = SANDBOXES.find((s) => s.key === key);
  if (!def) throw new Error(`Sandbox desconhecida: ${key}`);
  const user = await getSandboxUser(key);
  if (!user) throw new Error(`Conta-sandbox em falta: ${key} (migração 20261117_06 por aplicar?)`);
  const now = Date.now();
  const day = 86400000;

  await db.transaction(async (tx) => {
    // 1. Limpar. Estabelecimentos levam reviews, respostas dessas reviews e ligações (ON DELETE CASCADE, RJ-1.4).
    await tx.delete(responses).where(eq(responses.userId, user.id));
    await tx.delete(establishments).where(eq(establishments.userId, user.id));
    await tx.delete(socialPlatformConnections).where(eq(socialPlatformConnections.userId, user.id));
    await tx.delete(creditTransactions).where(eq(creditTransactions.userId, user.id));
    if (key === "agencia") {
      await tx.update(users).set({ agencyId: null }).where(inArray(users.email, [sandboxEmail("agencia"), sandboxEmail("membro")]));
      await tx.delete(agencies).where(eq(agencies.ownerId, user.id)); // leva agency_members em cascata
    }

    // 2. Estado da conta.
    await tx.update(users).set({
      subscriptionPlan: def.plan,
      selectedPlan: def.plan,
      credits: def.credits,
      creditsUsedThisPeriod: def.creditsUsed,
      currentPeriodStart: new Date(now - 10 * day),
      currentPeriodEnd: new Date(now + def.periodDays * day),
      isActive: true,
      isAgencyOwner: key === "agencia",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    // 3. Estabelecimentos, ligações, reviews e respostas.
    let offset = 0;
    for (const est of def.establishments) {
      const [e] = await tx.insert(establishments).values({
        userId: user.id,
        name: est.name,
        type: est.type,
        brandTone: "simpático e profissional",
      }).returning();

      await tx.insert(socialPlatformConnections).values(est.platforms.map((platform) => ({
        userExternalId: `sandbox:${key}`,
        userId: user.id,
        establishmentId: e.id,
        platform,
        status: "connected",
        lastSyncAt: new Date(now - 3 * 3600000),
        meta: { mode: "sandbox", lastSync: { ok: true, imported: 3, at: new Date(now - 3 * 3600000).toISOString() } },
      })));

      const pool = rotate(REVIEW_POOL, offset);
      offset += 3;
      const rows = await tx.insert(reviews).values(pool.map((r, i) => ({
        establishmentId: e.id,
        platform: est.platforms[i % est.platforms.length],
        externalId: `sandbox:${key}:${e.id}:${i}`,
        authorName: r.author,
        rating: r.rating,
        reviewText: r.text,
        language: r.lang,
        sentiment: r.rating >= 4 ? "positive" : r.rating === 3 ? "neutral" : "negative",
        reviewDate: new Date(now - r.daysAgo * day),
        externalResponseText: r.replied ?? null,
        externalResponseAt: r.replied ? new Date(now - (r.daysAgo - 1) * day) : null,
      }))).returning({ id: reviews.id, externalId: reviews.externalId });
      const idByIndex = new Map(rows.map((row) => [Number(String(row.externalId).split(":").pop()), row.id]));
      const inserted = pool.map((seed, i) => ({ row: { id: idByIndex.get(i)! }, seed }));

      await tx.insert(responses).values(GENERATED.map((g) => {
        // g.idx aponta para REVIEW_POOL original; o pool deste estabelecimento está rodado.
        const target = inserted.find((x) => x.seed === REVIEW_POOL[g.idx])!;
        return {
          reviewId: target.row.id,
          userId: user.id,
          responseText: g.text,
          originalMessage: target.seed.text,
          language: target.seed.lang,
          tone: "profissional",
          responseType: "resposta",
          creditsUsed: 1,
          aiModel: "sandbox-seed",
          approvalStatus: g.status,
          approvedAt: g.status === "approved" ? new Date(now - day) : null,
          createdAt: new Date(now - 2 * day),
        };
      }));
    }

    // 4. Movimentos de créditos de exemplo.
    if (def.creditsUsed > 0) {
      await tx.insert(creditTransactions).values({
        userId: user.id, type: "usage", amount: -def.creditsUsed, description: "Gerações de respostas (dados simulados)",
      });
    }

    // 5. Agência: o dono cria a agência e o membro entra na equipa.
    if (key === "agencia") {
      const member = await getSandboxUser("membro");
      const [agency] = await tx.insert(agencies).values({ name: "Agência Maré Digital (sandbox)", ownerId: user.id }).returning();
      await tx.update(users).set({ agencyId: agency.id }).where(eq(users.id, user.id));
      await tx.insert(agencyMembers).values({ agencyId: agency.id, userId: user.id, role: "admin", status: "active", joinedAt: new Date() });
      if (member) {
        const memberDef = SANDBOXES.find((d) => d.key === "membro")!;
        await tx.delete(responses).where(eq(responses.userId, member.id));
        await tx.update(users).set({
          agencyId: agency.id,
          subscriptionPlan: memberDef.plan,
          selectedPlan: memberDef.plan,
          credits: memberDef.credits,
          creditsUsedThisPeriod: 0,
          currentPeriodStart: new Date(now - 10 * day),
          currentPeriodEnd: new Date(now + memberDef.periodDays * day),
          isActive: true,
          isAgencyOwner: false,
          updatedAt: new Date(),
        }).where(eq(users.id, member.id));
        await tx.insert(agencyMembers).values({ agencyId: agency.id, userId: member.id, role: "member", status: "active", invitedBy: user.id, joinedAt: new Date() });
      }
    }
  });
}

/** Na primeira entrada, a sandbox ainda não tem dados: cria-os. */
export async function ensureSandboxSeeded(key: SandboxKey) {
  const user = await getSandboxUser(key);
  if (!user) throw new Error(`Conta-sandbox em falta: ${key}`);
  const def = SANDBOXES.find((s) => s.key === key)!;
  if (def.establishments.length === 0) {
    // O membro não tem estabelecimentos próprios; depende da agência estar criada.
    if (!user.agencyId) await resetSandbox("agencia");
    return getSandboxUser(key);
  }
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(establishments).where(eq(establishments.userId, user.id));
  if (count === 0) await resetSandbox(key);
  return getSandboxUser(key);
}

/** Gerações de IA feitas hoje por todas as sandboxes (limite diário partilhado). */
export async function sandboxGenerationsToday(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(responses)
    .innerJoin(users, eq(users.id, responses.userId))
    .where(and(eq(users.isSandbox, true), gte(responses.createdAt, start), sql`coalesce(${responses.aiModel}, '') <> 'sandbox-seed'`));
  return count;
}
