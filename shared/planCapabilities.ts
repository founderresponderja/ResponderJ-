/**
 * Capacidades por plano, derivadas de shared/plans.ts (RJ-2.1).
 * Mantido para compatibilidade com o código que já importa PLAN_CAPABILITIES.
 */
import { PLANS, normalizePlan as normalize, type PlanKey as Key } from "./plans.js";

const capabilities = (key: Key) => ({
  maxResponses: PLANS[key].monthlyResponses,
  maxPlatforms: PLANS[key].maxPlatforms,
  maxEstablishments: PLANS[key].maxEstablishments,
  ...PLANS[key].features,
});

export const PLAN_CAPABILITIES = {
  trial: capabilities("trial"),
  starter: capabilities("starter"),
  pro: capabilities("pro"),
  agency: capabilities("agency"),
};

export type PlanKey = Key;
export type PlanFeatureKey = keyof (typeof PLAN_CAPABILITIES)["trial"];
export const normalizePlan = normalize;
