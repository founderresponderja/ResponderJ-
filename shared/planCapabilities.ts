export const PLAN_CAPABILITIES = {
  trial: {
    maxResponses: 10,
    maxPlatforms: 1,
    hasAnalytics: false,
    hasAdvancedAnalytics: false,
    hasAgentTraining: false,
    hasAutoResponse: false,
    hasClientManagement: false,
    hasWhiteLabel: false
  },
  starter: {
    maxResponses: 50,
    maxPlatforms: 2,
    hasAnalytics: true,
    hasAdvancedAnalytics: false,
    hasAgentTraining: false,
    hasAutoResponse: false,
    hasClientManagement: false,
    hasWhiteLabel: false
  },
  pro: {
    maxResponses: 150,
    maxPlatforms: 5,
    hasAnalytics: true,
    hasAdvancedAnalytics: true,
    hasAgentTraining: true,
    hasAutoResponse: true,
    hasClientManagement: false,
    hasWhiteLabel: false
  },
  agency: {
    maxResponses: -1,
    maxPlatforms: -1,
    hasAnalytics: true,
    hasAdvancedAnalytics: true,
    hasAgentTraining: true,
    hasAutoResponse: true,
    hasClientManagement: true,
    hasWhiteLabel: true
  }
} as const;

export type PlanKey = keyof typeof PLAN_CAPABILITIES;
export type PlanFeatureKey = keyof (typeof PLAN_CAPABILITIES)["trial"];

export const normalizePlan = (plan?: string | null): PlanKey => {
  const value = String(plan || "").toLowerCase();
  if (value === "regular") return "starter";
  if (value in PLAN_CAPABILITIES) return value as PlanKey;
  return "trial";
};
