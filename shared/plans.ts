/**
 * RJ-2.1 — Fonte única dos planos do Responder Já.
 *
 * Tudo o que depende de um plano (preço, respostas por mês, plataformas, estabelecimentos,
 * utilizadores, funcionalidades, página de preços, créditos atribuídos pelo Stripe) lê daqui.
 * Para mudar um plano, muda-se só este ficheiro.
 *
 * Valores = os da página de preços (o que o cliente compra). -1 = sem limite.
 */
export type PlanKey = "trial" | "starter" | "pro" | "agency";

export interface PlanDefinition {
  key: PlanKey;
  label: string;
  priceEur: number;           // por mês
  monthlyResponses: number;   // respostas de IA por mês (créditos)
  maxPlatforms: number;       // plataformas ligadas por estabelecimento
  maxEstablishments: number;  // estabelecimentos / clientes geridos
  users: number;
  trialDays?: number;
  stripePriceEnv?: string[];  // variáveis da Vercel com o price ID do Stripe
  features: {
    hasAnalytics: boolean;
    hasAdvancedAnalytics: boolean;
    hasAgentTraining: boolean;
    hasAutoResponse: boolean;
    hasClientManagement: boolean;
    hasWhiteLabel: boolean;
  };
  marketing: { subtitle: string; bullets: string[]; highlight?: boolean };
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  trial: {
    key: "trial", label: "Experimental", priceEur: 0,
    monthlyResponses: 10, maxPlatforms: 1, maxEstablishments: 1, users: 1, trialDays: 7,
    features: { hasAnalytics: false, hasAdvancedAnalytics: false, hasAgentTraining: false, hasAutoResponse: false, hasClientManagement: false, hasWhiteLabel: false },
    marketing: { subtitle: "7 dias, sem cartão", bullets: ["7 dias de teste", "10 respostas IA", "Sem cartão de crédito"] },
  },
  starter: {
    key: "starter", label: "Starter", priceEur: 19.99,
    monthlyResponses: 50, maxPlatforms: 2, maxEstablishments: 1, users: 1,
    stripePriceEnv: ["STRIPE_PRICE_ID_STARTER", "STRIPE_STARTER_PRICE_ID"],
    features: { hasAnalytics: true, hasAdvancedAnalytics: false, hasAgentTraining: false, hasAutoResponse: false, hasClientManagement: false, hasWhiteLabel: false },
    marketing: { subtitle: "50 respostas IA, 1 utilizador", bullets: ["50 respostas IA/mês", "1 estabelecimento, até 2 plataformas", "1 utilizador"], highlight: true },
  },
  pro: {
    key: "pro", label: "Profissional", priceEur: 49.99,
    monthlyResponses: 150, maxPlatforms: 5, maxEstablishments: 1, users: 1,
    stripePriceEnv: ["STRIPE_PRICE_ID_PRO", "STRIPE_PRO_PRICE_ID"],
    features: { hasAnalytics: true, hasAdvancedAnalytics: true, hasAgentTraining: true, hasAutoResponse: true, hasClientManagement: false, hasWhiteLabel: false },
    marketing: { subtitle: "150 respostas IA, suporte prioritário", bullets: ["150 respostas IA/mês", "1 estabelecimento, até 5 plataformas", "1 utilizador", "Suporte prioritário"] },
  },
  agency: {
    key: "agency", label: "Agência", priceEur: 149.99,
    monthlyResponses: 500, maxPlatforms: -1, maxEstablishments: 5, users: 5,
    stripePriceEnv: ["STRIPE_PRICE_ID_AGENCY", "STRIPE_AGENCY_PRICE_ID"],
    features: { hasAnalytics: true, hasAdvancedAnalytics: true, hasAgentTraining: true, hasAutoResponse: true, hasClientManagement: true, hasWhiteLabel: true },
    marketing: { subtitle: "500 respostas IA, 5 utilizadores", bullets: ["500 respostas IA/mês", "Até 5 clientes geridos", "5 utilizadores", "Suporte prioritário"] },
  },
};

export const PLAN_KEYS = Object.keys(PLANS) as PlanKey[];

export function normalizePlan(plan?: string | null): PlanKey {
  const value = String(plan || "").toLowerCase();
  if (value === "regular") return "starter";
  if (value === "free") return "trial";
  return (PLAN_KEYS as string[]).includes(value) ? (value as PlanKey) : "trial";
}

export const isUnlimited = (n: number) => n === -1;
export const formatPriceEur = (n: number) => (n === 0 ? "Grátis" : `${n.toFixed(2).replace(".", ",")} €/mês`);
