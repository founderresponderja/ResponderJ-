import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/clerk-react";
import type { PlanKey } from "../shared/planCapabilities";

export interface SubscriptionState {
  planId: PlanKey;
  status: "active" | "trial" | "expired" | "canceled";
  isTrialing: boolean;
  trialEndsAt: string | null;
  creditsRemaining: number;
  creditsTotal: number;
  creditsUsedThisPeriod: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  platformsConnected: number;
  platformsLimit: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  capabilities: {
    hasAnalytics: boolean;
    hasAdvancedAnalytics: boolean;
    hasAgentTraining: boolean;
    hasAutoResponse: boolean;
    hasClientManagement: boolean;
    hasWhiteLabel: boolean;
  };
}

export interface SubscriptionContextValue extends SubscriptionState {
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  hasFeature: (feature: keyof SubscriptionState["capabilities"]) => boolean;
  isOutOfCredits: boolean;
  daysUntilPeriodEnd: number | null;
}

const DEFAULT_STATE: SubscriptionState = {
  planId: "trial",
  status: "trial",
  isTrialing: false,
  trialEndsAt: null,
  creditsRemaining: 0,
  creditsTotal: 0,
  creditsUsedThisPeriod: 0,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  platformsConnected: 0,
  platformsLimit: 0,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  capabilities: {
    hasAnalytics: false,
    hasAdvancedAnalytics: false,
    hasAgentTraining: false,
    hasAutoResponse: false,
    hasClientManagement: false,
    hasWhiteLabel: false,
  },
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [state, setState] = useState<SubscriptionState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!isSignedIn) {
      setState(DEFAULT_STATE);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/billing/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Failed to load subscription: ${res.status}`);
      }

      const data = await res.json();
      setState(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (isLoaded) {
      void fetchSubscription();
    }
  }, [isLoaded, isSignedIn, fetchSubscription]);

  useEffect(() => {
    const handleFocus = () => {
      if (isSignedIn) {
        void fetchSubscription();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isSignedIn, fetchSubscription]);

  const hasFeature = useCallback(
    (feature: keyof SubscriptionState["capabilities"]) => Boolean(state.capabilities?.[feature]),
    [state.capabilities]
  );

  const isOutOfCredits = state.creditsRemaining <= 0 && state.creditsTotal !== -1;

  const daysUntilPeriodEnd = state.currentPeriodEnd
    ? Math.max(
        0,
        Math.ceil(
          (new Date(state.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const value: SubscriptionContextValue = {
    ...state,
    isLoading,
    error,
    refresh: fetchSubscription,
    hasFeature,
    isOutOfCredits,
    daysUntilPeriodEnd,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}
