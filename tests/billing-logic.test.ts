// RJ-6.3: testes onde o dinheiro e os créditos se movem.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolvePaidPlan,
  creditsForPlan,
  computeSubscriptionSync,
  subscriptionDeletedUpdate,
  decideWebhookReplay,
  buildAcceptUpdate,
  acceptCost,
  isPaidPlan,
} from "../server/services/billing-logic.ts";
import { PLANS, normalizePlan } from "../shared/plans.ts";
import { PLAN_CAPABILITIES } from "../shared/planCapabilities.ts";

const ENV = {
  STRIPE_PRICE_ID_STARTER: "price_starter_live",
  STRIPE_PRO_PRICE_ID: "price_pro_live", // nome alternativo também aceite
  STRIPE_PRICE_ID_AGENCY: "price_agency_live",
};

describe("plano a partir da subscrição do Stripe", () => {
  test("pelo price ID configurado (nomes de variável principal e alternativo)", () => {
    assert.deepEqual(resolvePaidPlan({ priceId: "price_starter_live", env: ENV }), { planId: "starter", via: "price" });
    assert.deepEqual(resolvePaidPlan({ priceId: "price_pro_live", env: ENV }), { planId: "pro", via: "price" });
    assert.deepEqual(resolvePaidPlan({ priceId: "price_agency_live", env: ENV }), { planId: "agency", via: "price" });
  });

  test("o price ID tem prioridade sobre os metadados", () => {
    assert.equal(resolvePaidPlan({ priceId: "price_pro_live", metadataPlanId: "starter", env: ENV }).planId, "pro");
  });

  test("preço inline (sem price ID configurado) usa o plano dos metadados do checkout", () => {
    assert.deepEqual(resolvePaidPlan({ priceId: "price_inline_123", metadataPlanId: "agency", env: ENV }), { planId: "agency", via: "metadata" });
  });

  test("preço desconhecido e sem metadados válidos: nenhum plano (o webhook falha e o Stripe repete)", () => {
    assert.equal(resolvePaidPlan({ priceId: "price_x", env: ENV }).planId, null);
    assert.equal(resolvePaidPlan({ priceId: "price_x", metadataPlanId: "trial", env: ENV }).planId, null);
    assert.equal(resolvePaidPlan({ priceId: "price_x", metadataPlanId: "enterprise", env: ENV }).planId, null);
  });

  test("variáveis vazias nunca correspondem a um price ID vazio", () => {
    assert.equal(resolvePaidPlan({ priceId: "", env: {} }).planId, null);
  });

  test("só starter, pro e agency são planos pagos", () => {
    assert.ok(isPaidPlan("pro"));
    assert.ok(!isPaidPlan("trial"));
    assert.ok(!isPaidPlan(undefined));
  });
});

describe("créditos por plano", () => {
  test("igual às respostas mensais do plano", () => {
    assert.equal(creditsForPlan("starter"), PLANS.starter.monthlyResponses);
    assert.equal(creditsForPlan("pro"), PLANS.pro.monthlyResponses);
    assert.equal(creditsForPlan("agency"), 500);
  });

  test("a tabela de capacidades deriva dos planos (fonte única)", () => {
    for (const key of ["trial", "starter", "pro", "agency"] as const) {
      assert.equal(PLAN_CAPABILITIES[key].maxResponses, PLANS[key].monthlyResponses);
    }
  });

  test("nomes antigos de plano", () => {
    assert.equal(normalizePlan("regular"), "starter");
    assert.equal(normalizePlan("free"), "trial");
    assert.equal(normalizePlan("PRO"), "pro");
    assert.equal(normalizePlan("qualquer"), "trial");
    assert.equal(normalizePlan(null), "trial");
  });
});

describe("aplicar subscrição ao utilizador", () => {
  const now = new Date("2026-11-17T12:00:00Z");
  const start = Date.UTC(2026, 10, 17) / 1000;
  const end = Date.UTC(2026, 11, 17) / 1000;
  const sub = { id: "sub_1", customerId: "cus_1", currentPeriodStart: start, currentPeriodEnd: end };

  test("primeiro pagamento (experimental -> pro): plano, cliente e créditos do plano", () => {
    const r = computeSubscriptionSync(
      { subscriptionPlan: "trial", stripeCustomerId: null, currentPeriodEnd: new Date("2026-11-20") },
      sub, "pro", { resetCreditsOnPlanChange: true }, now,
    );
    assert.equal(r.skip, false);
    if (r.skip) return;
    assert.equal(r.update.subscriptionPlan, "pro");
    assert.equal(r.update.selectedPlan, "pro");
    assert.equal(r.update.stripeCustomerId, "cus_1");
    assert.equal(r.update.stripeSubscriptionId, "sub_1");
    assert.equal(r.update.credits, 150);
    assert.equal(r.update.creditsUsedThisPeriod, 0);
    assert.equal(r.update.currentPeriodEnd.getTime(), end * 1000);
    assert.ok(r.planChanged);
  });

  test("evento repetido (mesma subscrição, plano e período): nada muda", () => {
    const r = computeSubscriptionSync(
      { subscriptionPlan: "pro", stripeSubscriptionId: "sub_1", stripeCustomerId: "cus_1", currentPeriodEnd: new Date(end * 1000) },
      sub, "pro", { resetCreditsOnPlanChange: true }, now,
    );
    assert.deepEqual(r, { skip: true });
  });

  test("renovação mensal (novo período): créditos repostos", () => {
    const r = computeSubscriptionSync(
      { subscriptionPlan: "pro", stripeSubscriptionId: "sub_1", stripeCustomerId: "cus_1", currentPeriodEnd: new Date(start * 1000) },
      sub, "pro", {}, now,
    );
    assert.equal(r.skip, false);
    if (r.skip) return;
    assert.equal(r.update.credits, 150);
    assert.ok(r.creditsReset);
    assert.ok(!r.planChanged);
  });

  test("upgrade a meio do período (pro -> agência): créditos do novo plano", () => {
    const r = computeSubscriptionSync(
      { subscriptionPlan: "pro", stripeSubscriptionId: "sub_1", stripeCustomerId: "cus_1", currentPeriodEnd: new Date(end * 1000) },
      sub, "agency", {}, now,
    );
    assert.equal(r.skip, false);
    if (r.skip) return;
    assert.equal(r.update.credits, 500);
    assert.ok(r.planChanged);
  });

  test("atualização sem mudar plano nem período (ex.: outro cartão): créditos intactos", () => {
    const r = computeSubscriptionSync(
      { subscriptionPlan: "pro", stripeSubscriptionId: "sub_OLD", stripeCustomerId: "cus_1", currentPeriodEnd: new Date(end * 1000) },
      sub, "pro", {}, now,
    );
    assert.equal(r.skip, false);
    if (r.skip) return;
    assert.equal("credits" in r.update, false);
    assert.equal(r.update.stripeSubscriptionId, "sub_1");
  });

  test("nunca substitui um cliente Stripe já ligado", () => {
    const r = computeSubscriptionSync({ subscriptionPlan: "trial", stripeCustomerId: "cus_ORIG" }, sub, "starter", {}, now);
    assert.equal(r.skip, false);
    if (r.skip) return;
    assert.equal(r.update.stripeCustomerId, "cus_ORIG");
  });

  test("subscrição sem datas de período mantém as do utilizador", () => {
    const keepEnd = new Date("2026-12-01T00:00:00Z");
    const r = computeSubscriptionSync(
      { subscriptionPlan: "starter", currentPeriodEnd: keepEnd },
      { id: "sub_2", customerId: "cus_2" }, "starter", {}, now,
    );
    assert.equal(r.skip, false);
    if (r.skip) return;
    assert.equal(r.update.currentPeriodEnd.getTime(), keepEnd.getTime());
  });

  test("cancelamento: volta ao experimental, sem créditos, acesso termina já", () => {
    const u = subscriptionDeletedUpdate(now);
    assert.equal(u.subscriptionPlan, "trial");
    assert.equal(u.selectedPlan, "trial");
    assert.equal(u.credits, 0);
    assert.equal(u.stripeSubscriptionId, null);
    assert.equal(u.currentPeriodEnd.getTime(), now.getTime());
  });
});

describe("webhook do Stripe: eventos repetidos", () => {
  const now = Date.parse("2026-11-17T12:00:00Z");
  test("evento novo: processa", () => assert.equal(decideWebhookReplay(undefined, now), "retry"));
  test("já processado: ignora", () => assert.equal(decideWebhookReplay({ status: "processed" }, now), "skip"));
  test("em processamento há 1 minuto: ignora (outro pedido trata dele)", () => {
    assert.equal(decideWebhookReplay({ status: "processing", receivedAt: new Date(now - 60000) }, now), "skip");
  });
  test("preso em processamento há 6 minutos: volta a processar", () => {
    assert.equal(decideWebhookReplay({ status: "processing", receivedAt: new Date(now - 6 * 60000) }, now), "retry");
  });
  test("falhou antes: volta a processar", () => assert.equal(decideWebhookReplay({ status: "failed" }, now), "retry"));
});

describe("aceitar uma resposta", () => {
  const now = new Date("2026-11-17T12:00:00Z");
  test("sem edição: aprovada, texto intacto", () => {
    const { update, isEdited } = buildAcceptUpdate({ responseText: "Obrigado!" }, undefined, now);
    assert.equal(isEdited, false);
    assert.deepEqual(update, { approvalStatus: "approved", approvedAt: now });
  });
  test("texto igual (com espaços) não conta como edição", () => {
    assert.equal(buildAcceptUpdate({ responseText: "Obrigado!" }, "  Obrigado!  ", now).isEdited, false);
  });
  test("com edição: guarda o texto original e conta a edição", () => {
    const { update, isEdited } = buildAcceptUpdate({ responseText: "Obrigado!", editCount: 1 }, "Muito obrigado!", now);
    assert.ok(isEdited);
    assert.equal(update.approvalStatus, "edited");
    assert.equal(update.responseText, "Muito obrigado!");
    assert.equal(update.originalResponseText, "Obrigado!");
    assert.equal(update.editCount, 2);
  });
  test("mantém o original da IA se a resposta já tinha sido editada antes", () => {
    const { update } = buildAcceptUpdate({ responseText: "V2", originalResponseText: "V1" }, "V3", now);
    assert.equal(update.originalResponseText, "V1");
  });
  test("aceitar marca sempre approvedAt (é o que marca a resposta como cobrada)", () => {
    assert.ok(buildAcceptUpdate({ responseText: "a" }, "b", now).update.approvedAt instanceof Date);
  });
  test("custo: o gravado na resposta, nunca menos de 1", () => {
    assert.equal(acceptCost(1), 1);
    assert.equal(acceptCost(2), 2);
    assert.equal(acceptCost(0), 1);
    assert.equal(acceptCost(-3), 1);
    assert.equal(acceptCost(null), 1);
    assert.equal(acceptCost(1.5), 1);
  });
});

import { subscriptionAccess } from "../server/services/billing-logic.ts";

describe("estado da subscrição no Stripe (RJ-3.2)", () => {
  test("ativa e em teste: plano ativo", () => {
    assert.equal(subscriptionAccess("active"), "active");
    assert.equal(subscriptionAccess("trialing"), "active");
  });
  test("pagamento em atraso: período de graça", () => assert.equal(subscriptionAccess("past_due"), "grace"));
  test("primeiro pagamento por confirmar: ainda não dá o plano", () => assert.equal(subscriptionAccess("incomplete"), "pending"));
  test("cancelada, não paga, expirada ou em pausa: perde o plano", () => {
    for (const s of ["canceled", "unpaid", "incomplete_expired", "paused"]) assert.equal(subscriptionAccess(s), "revoke");
  });
});

// Preços novos (Sandbox 27/11/2026): procurados pelo nome interno, IVA no checkout.
import {
  normalizeInterval,
  lookupKeyFor,
  planFromLookupKey,
  checkoutTaxParams,
  envFlag,
} from "../server/services/billing-logic.ts";

describe("preços pelo nome interno (lookup key)", () => {
  test("nome interno de cada plano e período", () => {
    assert.equal(lookupKeyFor("starter", "month"), "rj_essencial_mensal");
    assert.equal(lookupKeyFor("pro", "year"), "rj_profissional_anual");
    assert.equal(lookupKeyFor("agency", "month"), "rj_agencia_mensal");
  });

  test("plano a partir do nome interno (ida e volta)", () => {
    for (const plan of ["starter", "pro", "agency"] as const) {
      for (const interval of ["month", "year"] as const) {
        assert.equal(planFromLookupKey(lookupKeyFor(plan, interval)), plan);
      }
    }
  });

  test("nomes que não são planos pagos do Responder Já não dão plano", () => {
    assert.equal(planFromLookupKey("rj_gratuito_mensal"), null);
    assert.equal(planFromLookupKey("rj_local_extra_mensal"), null);
    assert.equal(planFromLookupKey("subly_premium_mensal"), null);
    assert.equal(planFromLookupKey(null), null);
  });

  test("subscrição com preço novo: plano pelo nome interno", () => {
    assert.deepEqual(
      resolvePaidPlan({ priceId: "price_novo", lookupKey: "rj_profissional_anual", env: ENV }),
      { planId: "pro", via: "lookup_key" },
    );
  });

  test("price ID configurado continua a ter prioridade (live atual não muda)", () => {
    assert.equal(resolvePaidPlan({ priceId: "price_starter_live", lookupKey: "rj_agencia_mensal", env: ENV }).planId, "starter");
  });

  test("período: mensal por omissão, anual só quando pedido", () => {
    assert.equal(normalizeInterval(undefined), "month");
    assert.equal(normalizeInterval("qualquer"), "month");
    assert.equal(normalizeInterval("year"), "year");
    assert.equal(normalizeInterval("anual"), "year");
  });
});

describe("IVA no checkout", () => {
  test("desligado: o checkout fica exatamente como antes", () => {
    assert.deepEqual(checkoutTaxParams({ enabled: false, existingCustomer: true }), {});
  });

  test("ligado: IVA automático, morada obrigatória, NIF e códigos promocionais", () => {
    const p = checkoutTaxParams({ enabled: true, existingCustomer: false });
    assert.deepEqual(p.automatic_tax, { enabled: true });
    assert.deepEqual(p.tax_id_collection, { enabled: true });
    assert.equal(p.billing_address_collection, "required");
    assert.equal(p.allow_promotion_codes, true);
    assert.equal(p.customer_update, undefined);
  });

  test("cliente já existente: autoriza guardar a morada e o nome", () => {
    assert.deepEqual(checkoutTaxParams({ enabled: true, existingCustomer: true }).customer_update, { address: "auto", name: "auto" });
  });

  test("variável de ambiente", () => {
    assert.equal(envFlag("true"), true);
    assert.equal(envFlag(" SIM "), true);
    assert.equal(envFlag(undefined), false);
    assert.equal(envFlag("false"), false);
  });
});
