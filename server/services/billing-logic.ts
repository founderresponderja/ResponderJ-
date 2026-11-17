// RJ-6.3: regras onde o dinheiro e os créditos se movem, sem acesso à base de dados nem ao
// Stripe, para poderem ser testadas (tests/billing-logic.test.ts). O código que fala com a
// base de dados e com o Stripe (billing-service.ts, routes/billing.ts, routes.ts) usa estas
// funções e só trata de ler e gravar.

import { PLANS } from "../../shared/plans.js";

export type PaidPlan = "starter" | "pro" | "agency";
export const PAID_PLANS: PaidPlan[] = ["starter", "pro", "agency"];

export function isPaidPlan(value: unknown): value is PaidPlan {
  return typeof value === "string" && (PAID_PLANS as string[]).includes(value);
}

/**
 * Que plano corresponde a uma subscrição do Stripe.
 * 1) Pelo price ID configurado nas variáveis STRIPE_PRICE_ID_* (o caminho normal).
 * 2) Se não houver correspondência, pelo planId que o próprio checkout escreveu nos metadados
 *    da subscrição. Isto cobre o checkout sem price ID configurado (preço inline), que antes
 *    deixava o cliente a pagar sem nunca receber o plano.
 */
export function resolvePaidPlan(input: {
  priceId?: string | null;
  metadataPlanId?: string | null;
  env: Record<string, string | undefined>;
}): { planId: PaidPlan | null; via: "price" | "metadata" | null } {
  const priceId = input.priceId || "";
  if (priceId) {
    for (const key of PAID_PLANS) {
      const ids = (PLANS[key].stripePriceEnv || []).map((name) => input.env[name] || "");
      if (ids.some((id) => id && id === priceId)) return { planId: key, via: "price" };
    }
  }
  if (isPaidPlan(input.metadataPlanId)) return { planId: input.metadataPlanId, via: "metadata" };
  return { planId: null, via: null };
}

/** Créditos de um período: as respostas mensais do plano (-1 = ilimitado). */
export function creditsForPlan(planId: PaidPlan): number {
  const monthly = PLANS[planId].monthlyResponses;
  return monthly === -1 ? 999999 : monthly;
}

const toMs = (value: Date | string | null | undefined): number | null => {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};

export interface BillingUserSnapshot {
  subscriptionPlan?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  currentPeriodStart?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
}

export interface SubscriptionSnapshot {
  id: string;
  customerId: string;
  /** Segundos (como o Stripe envia). */
  currentPeriodStart?: number | null;
  currentPeriodEnd?: number | null;
}

/**
 * O que gravar no utilizador quando chega uma subscrição.
 * - Mesma subscrição, mesmo plano e mesmo período: nada a fazer (evento repetido).
 * - Plano mudou, ou foi pedido reset (checkout/criação): créditos repostos ao valor do plano.
 * - Novo período (renovação mensal): créditos repostos.
 * - Outra alteração (ex.: estado do cartão): só atualiza os campos, não mexe nos créditos.
 */
export function computeSubscriptionSync(
  user: BillingUserSnapshot,
  sub: SubscriptionSnapshot,
  planId: PaidPlan,
  options: { resetCreditsOnPlanChange?: boolean } = {},
  now: Date = new Date(),
):
  | { skip: true }
  | { skip: false; update: Record<string, any>; planChanged: boolean; creditsReset: boolean } {
  const periodStart = sub.currentPeriodStart
    ? new Date(sub.currentPeriodStart * 1000)
    : user.currentPeriodStart ? new Date(user.currentPeriodStart) : undefined;
  const periodEnd = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd * 1000)
    : user.currentPeriodEnd ? new Date(user.currentPeriodEnd) : undefined;

  const existingEndMs = toMs(user.currentPeriodEnd);
  const newEndMs = periodEnd ? periodEnd.getTime() : null;
  const planChanged = user.subscriptionPlan !== planId;
  const periodChanged = existingEndMs !== null && newEndMs !== null && existingEndMs !== newEndMs;

  if (
    user.stripeSubscriptionId === sub.id &&
    !planChanged &&
    existingEndMs !== null &&
    newEndMs !== null &&
    existingEndMs === newEndMs
  ) {
    return { skip: true };
  }

  const update: Record<string, any> = {
    selectedPlan: planId,
    subscriptionPlan: planId,
    stripeCustomerId: user.stripeCustomerId || sub.customerId,
    stripeSubscriptionId: sub.id,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    updatedAt: now,
  };

  const creditsReset = planChanged || !!options.resetCreditsOnPlanChange || periodChanged;
  if (creditsReset) {
    update.credits = creditsForPlan(planId);
    update.creditsUsedThisPeriod = 0;
  }
  return { skip: false, update, planChanged, creditsReset };
}

/** Subscrição cancelada: volta ao Experimental, sem créditos, com o acesso a terminar já. */
export function subscriptionDeletedUpdate(now: Date = new Date()) {
  return {
    selectedPlan: "trial",
    subscriptionPlan: "trial",
    stripeSubscriptionId: null,
    credits: 0,
    creditsUsedThisPeriod: 0,
    currentPeriodEnd: now,
    updatedAt: now,
  };
}

/**
 * Idempotência do webhook (RJ-3.1): um evento já registado volta a ser processado?
 * - processado: não;
 * - a ser processado há menos de 5 minutos: não (outro pedido trata dele);
 * - falhou, ou ficou preso mais de 5 minutos: sim (o Stripe está a repetir).
 */
export function decideWebhookReplay(
  prev: { status?: string | null; receivedAt?: Date | string | null } | undefined,
  nowMs: number = Date.now(),
): "skip" | "retry" {
  if (!prev) return "retry";
  if (prev.status === "processed") return "skip";
  if (prev.status === "processing") {
    const receivedMs = toMs(prev.receivedAt);
    const stuck = receivedMs === null || nowMs - receivedMs > 5 * 60000;
    return stuck ? "retry" : "skip";
  }
  return "retry";
}

/** Só se aceita (e se cobra) uma resposta que ainda está pendente ou editada. */
export const ACCEPTABLE_STATUSES = ["pending", "edited"] as const;

/** Campos a gravar ao aceitar uma resposta (com ou sem edição do texto). */
export function buildAcceptUpdate(
  response: { responseText: string; originalResponseText?: string | null; editCount?: number | null },
  editedText: unknown,
  now: Date = new Date(),
) {
  const edited = typeof editedText === "string" ? editedText.trim() : "";
  const isEdited = !!edited && edited !== response.responseText;
  const update: Record<string, any> = {
    approvalStatus: isEdited ? "edited" : "approved",
    approvedAt: now,
  };
  if (isEdited) {
    update.responseText = edited;
    update.originalResponseText = response.originalResponseText || response.responseText;
    update.editCount = (response.editCount || 0) + 1;
  }
  return { update, isEdited };
}

/** Custo de aceitar uma resposta: o gravado na resposta, nunca menos de 1. */
export function acceptCost(creditsUsed: number | null | undefined): number {
  const n = Number(creditsUsed);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}
