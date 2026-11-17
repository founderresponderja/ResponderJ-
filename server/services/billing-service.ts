import Stripe from "stripe";
import { PLANS } from "../../shared/plans.js";
import { storage } from "../storage.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  apiVersion: "2025-07-30.basil" as any,
});

const getEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
};

export class BillingService {
  // RJ-2.1: derivado de shared/plans.ts (fonte única).
  static PAYMENT_PLANS = Object.fromEntries(
    (["starter", "pro", "agency"] as const).map((key) => {
      const p = PLANS[key];
      return [key, {
        id: key,
        name: p.label,
        priceId: getEnv(...(p.stripePriceEnv as [string, string])) || `price_${key}`,
        price: p.priceEur,
        currency: "eur",
        credits: p.monthlyResponses,
        locations: p.maxEstablishments,
        users: p.users,
        byokSupported: false,
        features: p.marketing.bullets,
      }];
    }),
  ) as Record<"starter" | "pro" | "agency", {
    id: string; name: string; priceId: string; price: number; currency: string; credits: number;
    locations: number; users: number; byokSupported: boolean; features: string[];
  }>;

  static async createSubscription(userId: string, planId: string, paymentMethodId: string) {
    const plan = this.PAYMENT_PLANS[planId as keyof typeof this.PAYMENT_PLANS];
    if (!plan) {
      throw new Error("Plano inválido");
    }

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("Utilizador não encontrado");
    }

    // Criar customer no Stripe se não existir
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId }
      });
      customerId = customer.id;
      await storage.updateUserStripeCustomerId(userId, customerId);
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
    });

    // Update user subscription info
    await storage.updateUserStripeInfo(userId, { customerId, subscriptionId: subscription.id });
    await storage.updateUser(userId, { subscriptionPlan: planId });

    return {
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      status: subscription.status
    };
  }

  static async getUserBillingInfo(userId: string) {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("Utilizador não encontrado");
    }

    let subscriptionData = null;
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const subscriptionAny = subscription as any;
        subscriptionData = {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date(subscriptionAny.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          plan: this.PAYMENT_PLANS[user.subscriptionPlan as keyof typeof this.PAYMENT_PLANS]
        };
      } catch (error) {
        console.error("Erro ao obter subscrição do Stripe:", error);
      }
    }

    // Obter invoices recentes
    let invoices = [];
    if (user.stripeCustomerId) {
      try {
        const invoiceList = await stripe.invoices.list({
          customer: user.stripeCustomerId,
          limit: 10
        });
        invoices = invoiceList.data.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          status: invoice.status,
          date: new Date(invoice.created * 1000),
          invoiceUrl: invoice.hosted_invoice_url
        }));
      } catch (error) {
        console.error("Erro ao obter invoices:", error);
      }
    }

    return {
      subscription: subscriptionData,
      invoices,
      availablePlans: this.PAYMENT_PLANS,
      currentPlan: user.subscriptionPlan || null,
      credits: user.credits || 0
    };
  }

  static async syncSubscriptionToDatabase(
    subscription: Stripe.Subscription,
    options?: { resetCreditsOnPlanChange?: boolean }
  ): Promise<{ updated: boolean; userId?: number; planId?: string }> {
    try {
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : (subscription.customer as any)?.id;

      if (!customerId) {
        console.warn("[billing.sync] missing subscription.customer");
        return { updated: false };
      }

      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.warn("[billing.sync] user not found for customer:", customerId);
        return { updated: false };
      }

      const priceId = subscription.items?.data?.[0]?.price?.id;
      const planMap: Record<string, string[]> = Object.fromEntries(
        (["starter", "pro", "agency"] as const).map((key) => [key, (PLANS[key].stripePriceEnv || []).map((name) => process.env[name] || "")]),
      );

      const matchedEntry = Object.entries(planMap).find(
        ([, ids]) => ids.some((id) => id && id === priceId)
      );

      if (!matchedEntry) {
        console.error(
          `[billing.sync] unknown price ID: ${priceId} for subscription ${subscription.id}. ` +
          `User ${user.id} NOT updated. Add this price ID to STRIPE_PRICE_ID_* env vars.`
        );
        return { updated: false };
      }

      const planId = matchedEntry[0] as "starter" | "pro" | "agency";

      // RJ-2.1: créditos do período = respostas do plano (shared/plans.ts).
      const maxResponses = PLANS[planId].monthlyResponses;
      const newCredits = maxResponses === -1 ? 999999 : maxResponses;

      const planChanged = user.subscriptionPlan !== planId;
      const subscriptionAny = subscription as any;
      const currentPeriodStart = subscriptionAny.current_period_start
        ? new Date(subscriptionAny.current_period_start * 1000)
        : user.currentPeriodStart
        ? new Date(user.currentPeriodStart)
        : undefined;
      const currentPeriodEnd = subscriptionAny.current_period_end
        ? new Date(subscriptionAny.current_period_end * 1000)
        : user.currentPeriodEnd
        ? new Date(user.currentPeriodEnd)
        : undefined;

      const existingPeriodEnd = user.currentPeriodEnd instanceof Date
        ? user.currentPeriodEnd.getTime()
        : user.currentPeriodEnd
        ? new Date(user.currentPeriodEnd).getTime()
        : null;
      const currentPeriodEndMs = currentPeriodEnd?.getTime() ?? null;

      const periodChanged =
        existingPeriodEnd !== null &&
        currentPeriodEndMs !== null &&
        existingPeriodEnd !== currentPeriodEndMs;

      if (
        user.stripeSubscriptionId === subscription.id &&
        user.subscriptionPlan === planId &&
        existingPeriodEnd !== null &&
        currentPeriodEndMs !== null &&
        existingPeriodEnd === currentPeriodEndMs
      ) {
        return { updated: false };
      }

      const updateData: any = {
        selectedPlan: planId,
        subscriptionPlan: planId,
        stripeCustomerId: user.stripeCustomerId || customerId,
        stripeSubscriptionId: subscription.id,
        currentPeriodStart,
        currentPeriodEnd,
        updatedAt: new Date(),
      };

      if (planChanged || options?.resetCreditsOnPlanChange) {
        updateData.credits = newCredits;
        updateData.creditsUsedThisPeriod = 0;
      } else if (periodChanged) {
        updateData.credits = newCredits;
        updateData.creditsUsedThisPeriod = 0;
      }

      if (planChanged) {
        console.log(
          `[billing.sync] plan changed for user ${user.id}: ${user.subscriptionPlan} -> ${planId}`
        );
      }

      await storage.updateUser(user.id, updateData);
      return { updated: true, userId: user.id, planId };
    } catch (error) {
      console.error("[billing.sync] error:", error);
      return { updated: false };
    }
  }

  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : (subscription.customer as any)?.id;

      if (!customerId) {
        console.warn("[billing.subscription_deleted] missing subscription.customer");
        return;
      }

      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.warn("[billing.subscription_deleted] user not found for customer:", customerId);
        return;
      }

      await storage.updateUser(user.id, {
        selectedPlan: "trial",
        subscriptionPlan: "trial",
        stripeSubscriptionId: null,
        credits: 0,
        creditsUsedThisPeriod: 0,
        currentPeriodEnd: new Date(),
        updatedAt: new Date(),
      });

      console.log(`[billing.subscription_deleted] user ${user.id} reverted to trial`);
    } catch (error) {
      console.error("[billing.subscription_deleted] error:", error);
    }
  }

  static async handleSuccessfulPayment(subscriptionId: string | any, invoiceId: string) {
    try {
      const subId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
      const subscription = await stripe.subscriptions.retrieve(subId);
      const customerId = subscription.customer as string;
      
      // Find user by customer ID
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.error("Utilizador não encontrado para customer:", customerId);
        return;
      }

      // Add credits based on plan
      const plan = this.PAYMENT_PLANS[user.subscriptionPlan as keyof typeof this.PAYMENT_PLANS];
      if (plan) {
        await storage.addCreditsToUser(user.id, plan.credits, "subscription_renewal");
      }

      console.log(`Pagamento bem-sucedido para utilizador ${user.id}, ${plan?.credits} créditos adicionados`);
    } catch (error) {
      console.error("Erro ao processar pagamento bem-sucedido:", error);
    }
  }

  static async handlePaymentFailure(subscriptionId: string | any, invoiceId: string, error: any) {
    try {
      const subId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
      const subscription = await stripe.subscriptions.retrieve(subId);
      const customerId = subscription.customer as string;
      
      // Find user by customer ID
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.error("Utilizador não encontrado para customer:", customerId);
        return;
      }

      // Notify user about failed payment
      // Email notification would be sent here
      console.log(`Falha no pagamento para utilizador ${user.id}:`, error.message);
      
      // If subscription is past due, could temporarily suspend account
      if (subscription.status === 'past_due') {
        // Could update user status or limit functionality
        console.log(`Subscrição em atraso para utilizador ${user.id}`);
      }
    } catch (error) {
      console.error("Erro ao processar falha de pagamento:", error);
    }
  }

  static async cancelSubscription(userId: string) {
    const user = await storage.getUser(userId);
    if (!user || !user.stripeSubscriptionId) {
      throw new Error("Nenhuma subscrição activa encontrada");
    }

    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return {
      success: true,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
    };
  }

  static async reactivateSubscription(userId: string) {
    const user = await storage.getUser(userId);
    if (!user || !user.stripeSubscriptionId) {
      throw new Error("Nenhuma subscrição encontrada");
    }

    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    return {
      success: true,
      status: subscription.status
    };
  }
}
