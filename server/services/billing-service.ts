import Stripe from "stripe";
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
  static PAYMENT_PLANS = {
    starter: {
      id: "starter",
      name: "Starter",
      priceId: getEnv("STRIPE_PRICE_ID_STARTER", "STRIPE_STARTER_PRICE_ID") || "price_starter",
      price: 19.99,
      currency: "eur",
      credits: 50,
      locations: 1,
      users: 1,
      byokSupported: true,
      features: [
        "50 respostas AI por mês",
        "1 localização de negócio",
        "1 utilizador",
        "BYOK (IA) opcional",
        "Suporte por email"
      ]
    },
    pro: {
      id: "pro", 
      name: "Pro",
      priceId: getEnv("STRIPE_PRICE_ID_PRO", "STRIPE_PRO_PRICE_ID") || "price_pro",
      price: 49.99,
      currency: "eur", 
      credits: 150,
      locations: 1,
      users: 1,
      byokSupported: false,
      features: [
        "150 respostas AI por mês",
        "1 utilizador",
        "Suporte prioritário",
        "Análise avançada"
      ]
    },
    agency: {
      id: "agency",
      name: "Agência", 
      priceId: getEnv("STRIPE_PRICE_ID_AGENCY", "STRIPE_AGENCY_PRICE_ID") || "price_agency",
      price: 149.99,
      currency: "eur",
      credits: 500,
      locations: 5,
      users: 5,
      byokSupported: false,
      features: [
        "500 respostas AI por mês",
        "5 utilizadores",
        "Plano para agência/enterprise",
        "Suporte prioritário 24/7"
      ]
    }
  };

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
